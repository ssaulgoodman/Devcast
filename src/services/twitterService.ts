import { TwitterApi, ApiResponseError } from "twitter-api-v2";
import { Content, IContent } from "../models/Content";

/**
 * Service for interacting with Twitter/X API
 */
export class TwitterService {
  private client: TwitterApi;
  private maxRetries: number;
  private retryDelay: number;
  private rateLimitWindowMs: number;
  private lastRequestTime: number;

  /**
   * Initialize Twitter API client
   * 
   * @param accessToken Twitter access token
   * @param accessSecret Twitter access token secret
   * @param options Configuration options
   */
  constructor(
    accessToken: string, 
    accessSecret: string,
    options: {
      maxRetries?: number,
      retryDelay?: number,
      rateLimitWindowMs?: number
    } = {}
  ) {
    // Create client with user context
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_CLIENT_ID as string,
      appSecret: process.env.TWITTER_CLIENT_SECRET as string,
      accessToken: accessToken,
      accessSecret: accessSecret,
    });

    // Set defaults for retry and rate limiting
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.rateLimitWindowMs = options.rateLimitWindowMs || 500; // Minimum time between requests
    this.lastRequestTime = 0;
  }

  /**
   * Post a tweet with the content
   */
  async postTweet(content: IContent): Promise<{ id: string; url: string }> {
    let retries = 0;
    
    while (true) {
      try {
        // Enforce rate limiting
        await this.rateLimit();
        
        // Post the tweet
        const { data } = await this.client.v2.tweet(content.text);
        
        if (!data || !data.id) {
          throw new Error("Failed to post tweet: No tweet ID returned");
        }

        // Get the tweet URL
        const url = `https://twitter.com/i/status/${data.id}`;
        
        // Update the content record with success
        await Content.findByIdAndUpdate(content._id, {
          postId: data.id,
          postUrl: url,
          status: "posted",
          postedAt: new Date(),
        });

        // Log success
        console.log(`Successfully posted tweet with ID: ${data.id}`);

        return {
          id: data.id,
          url
        };
      } catch (error: any) {
        // Check for rate limit errors
        if (this.isRateLimitError(error)) {
          const resetTime = this.getRateLimitResetTime(error);
          console.warn(`Twitter rate limit hit. Waiting until ${new Date(resetTime).toISOString()}`);
          
          // Wait until rate limit resets (add 1 second buffer)
          await this.sleep(resetTime - Date.now() + 1000);
          continue; // Try again after waiting
        }
        
        // Handle retries for certain errors
        if (retries < this.maxRetries && this.isRetryableError(error)) {
          retries++;
          console.warn(`Retrying Twitter post (${retries}/${this.maxRetries}) after error: ${error.message}`);
          
          // Exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, retries - 1));
          continue; // Try again
        }
        
        // Update the content record with error
        const errorMessage = this.formatTwitterError(error);
        await Content.findByIdAndUpdate(content._id, {
          status: "rejected",
          metadata: {
            error: errorMessage,
            errorCode: error.code || error.statusCode,
            errorAt: new Date()
          },
        });

        // Log error details
        console.error("Failed to post tweet:", {
          contentId: content._id,
          error: errorMessage,
          stack: error.stack
        });

        throw error;
      }
    }
  }

  /**
   * Get tweet analytics
   */
  async getTweetAnalytics(tweetId: string): Promise<Record<string, number>> {
    try {
      // Enforce rate limiting
      await this.rateLimit();
      
      // Note: Public metrics only available with v2 API
      const { data } = await this.client.v2.singleTweet(tweetId, {
        "tweet.fields": ["public_metrics"],
      });
      
      if (!data || !data.public_metrics) {
        throw new Error("Failed to get tweet metrics");
      }

      return {
        likes: data.public_metrics.like_count || 0,
        retweets: data.public_metrics.retweet_count || 0,
        replies: data.public_metrics.reply_count || 0,
        impressions: data.public_metrics.impression_count || 0,
      };
    } catch (error) {
      // Log but don't fail on analytics errors
      console.error("Error fetching tweet analytics:", error);
      return {
        likes: 0,
        retweets: 0,
        replies: 0,
        impressions: 0,
      };
    }
  }

  /**
   * Update analytics for a posted content
   */
  async updateContentAnalytics(content: IContent): Promise<void> {
    if (!content.postId) {
      return; // Cannot update analytics without post ID
    }

    try {
      const analytics = await this.getTweetAnalytics(content.postId);
      
      await Content.findByIdAndUpdate(content._id, {
        analytics: {
          ...analytics,
          lastUpdated: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating content analytics:", error);
    }
  }

  /**
   * Verify Twitter credentials
   */
  async verifyCredentials(): Promise<{ id: string; username: string }> {
    try {
      // Enforce rate limiting
      await this.rateLimit();
      
      // Get current user to verify credentials
      const { data } = await this.client.v2.me({
        "user.fields": ["username"],
      });

      if (!data || !data.id) {
        throw new Error("Failed to verify Twitter credentials");
      }

      return {
        id: data.id,
        username: data.username || "",
      };
    } catch (error) {
      console.error("Error verifying Twitter credentials:", error);
      throw error;
    }
  }

  /**
   * Determine if an error is due to rate limiting
   */
  private isRateLimitError(error: any): boolean {
    return (
      error instanceof ApiResponseError && 
      error.code === 429
    );
  }

  /**
   * Get the reset time for rate limiting from error
   */
  private getRateLimitResetTime(error: any): number {
    // Try to get the rate limit reset time
    if (error.rateLimit && error.rateLimit.reset) {
      return error.rateLimit.reset * 1000; // Convert to milliseconds
    }
    
    // Default: wait 15 minutes if we can't determine the reset time
    return Date.now() + 15 * 60 * 1000;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors, 5xx errors, and some specific Twitter errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    if (error instanceof ApiResponseError) {
      // 500, 502, 503, 504 are server errors
      if (error.code >= 500 && error.code < 600) {
        return true;
      }
      
      // Some specific Twitter errors that might be temporary
      // See: https://developer.twitter.com/en/support/twitter-api/error-troubleshooting
      const retryableCodes = [
        130, // Over capacity
        131, // Internal error
        88,  // Rate limit
      ];
      
      return retryableCodes.includes(error.code);
    }
    
    return false;
  }

  /**
   * Format a Twitter error into a human-readable message
   */
  private formatTwitterError(error: any): string {
    if (error instanceof ApiResponseError) {
      if (error.data && error.data.errors && error.data.errors.length > 0) {
        // Get all error messages
        const errorMessages = error.data.errors.map((e: any) => 
          `${e.message} (code: ${e.code})`
        );
        return errorMessages.join(', ');
      }
      return `Twitter API error: ${error.message} (HTTP ${error.code})`;
    }
    
    return error.message || 'Unknown Twitter error';
  }

  /**
   * Enforce rate limiting between requests
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitWindowMs) {
      const waitTime = this.rateLimitWindowMs - timeSinceLastRequest;
      await this.sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Sleep for a specified number of milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 