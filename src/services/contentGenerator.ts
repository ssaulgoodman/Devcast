import 'openai/shims/node';
import OpenAI from "openai";
import { Activity } from "../models/Activity";
import { Content, IContent } from "../models/Content";
import { User } from "../models/User";
import { formatDistanceToNow } from "date-fns";

/**
 * Service for generating social media content from GitHub activities
 */
export class ContentGenerator {
  private openai: OpenAI;
  private userId: string;
  private contentStyle: string;
  private maxRetries: number;
  private retryDelay: number;
  private lastRequestTime: number;
  private rateLimitWindowMs: number;

  /**
   * Initialize content generator
   */
  constructor(
    userId: string, 
    contentStyle: string = "professional",
    options: {
      maxRetries?: number,
      retryDelay?: number,
      rateLimitWindowMs?: number
    } = {}
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.userId = userId;
    this.contentStyle = contentStyle;
    
    // Set defaults for retry and rate limiting
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.rateLimitWindowMs = options.rateLimitWindowMs || 1000; // Minimum time between requests
    this.lastRequestTime = 0;
  }

  /**
   * Generate social media content from recent activities
   */
  async generateContent(): Promise<IContent | null> {
    try {
      // Get unprocessed activities
      const activities = await Activity.find({
        user: this.userId,
        processed: false,
      })
        .sort({ createdAt: -1 })
        .limit(10);

      if (activities.length === 0) {
        return null; // No new activities to process
      }

      // Group activities by repository
      const activitiesByRepo = this.groupActivitiesByRepository(activities);

      // Get the most active repository
      const mostActiveRepo = Object.entries(activitiesByRepo).sort(
        ([, a], [, b]) => b.length - a.length
      )[0];

      if (!mostActiveRepo) {
        return null;
      }

      const [repoName, repoActivities] = mostActiveRepo;
      
      // Generate content for the most active repository
      const content = await this.generateContentForRepository(repoName, repoActivities);
      
      // Mark activities as processed
      const activityIds = repoActivities.map(activity => activity._id);
      await Activity.updateMany(
        { _id: { $in: activityIds } },
        { $set: { processed: true } }
      );

      return content;
    } catch (error) {
      console.error("Error generating content:", error);
      // Don't fail the entire process, just return null
      return null;
    }
  }

  /**
   * Group activities by repository
   */
  private groupActivitiesByRepository(activities: any[]) {
    const groupedActivities: Record<string, any[]> = {};
    
    for (const activity of activities) {
      if (!groupedActivities[activity.repository]) {
        groupedActivities[activity.repository] = [];
      }
      groupedActivities[activity.repository].push(activity);
    }
    
    return groupedActivities;
  }

  /**
   * Generate content for a specific repository
   */
  private async generateContentForRepository(
    repository: string,
    activities: any[]
  ): Promise<IContent> {
    try {
      // Get user for voice customization
      const user = await User.findById(this.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Prepare context for AI
      const context = this.prepareActivityContext(repository, activities);
      
      // Generate content using OpenAI
      const generatedText = await this.callOpenAI(context, user.settings.contentStyle || this.contentStyle);

      // Create the content record
      const content = await Content.create({
        user: this.userId,
        relatedActivities: activities.map(a => a._id),
        text: generatedText,
        originalText: generatedText,
        status: "pending",
        platform: "twitter",
      });

      return content;
    } catch (error) {
      console.error("Error generating content for repository:", error);
      
      // Create a fallback content record with error information
      const fallbackText = this.generateFallbackContent(repository, activities);
      const content = await Content.create({
        user: this.userId,
        relatedActivities: activities.map(a => a._id),
        text: fallbackText,
        originalText: fallbackText,
        status: "pending",
        platform: "twitter",
        metadata: {
          error: error instanceof Error ? error.message : "Unknown error",
          generatedByFallback: true
        }
      });
      
      return content;
    }
  }

  /**
   * Prepare context information for AI
   */
  private prepareActivityContext(repository: string, activities: any[]): string {
    const repoName = repository.split('/')[1];
    const commitCount = activities.filter(a => a.type === 'commit').length;
    const prCount = activities.filter(a => a.type === 'pull_request').length;
    const issueCount = activities.filter(a => a.type === 'issue').length;
    
    // Get the most recent activity for time reference
    const mostRecentActivity = [...activities].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    const timeAgo = formatDistanceToNow(new Date(mostRecentActivity.createdAt), { addSuffix: true });
    
    // Format activity details
    const activityDetails = activities.map(activity => {
      let detail = `- [${activity.type.toUpperCase()}] ${activity.title}`;
      if (activity.description && activity.description.trim()) {
        // Include truncated description if available
        const desc = activity.description.trim().split('\n')[0];
        if (desc.length > 50) {
          detail += `: ${desc.substring(0, 50)}...`;
        } else if (desc) {
          detail += `: ${desc}`;
        }
      }
      return detail;
    }).join('\n');

    return `
Repository: ${repository}
Project: ${repoName}
Activity Summary: ${commitCount} commits, ${prCount} pull requests, ${issueCount} issues
Time Frame: Most recent activity ${timeAgo}

Recent Activities:
${activityDetails}
`;
  }

  /**
   * Call OpenAI API to generate content
   */
  private async callOpenAI(context: string, style: string): Promise<string> {
    const prompt = `
You are a technical social media manager for a developer who wants to share their coding progress.
Create an engaging tweet about their recent GitHub activity.

The tweet should:
- Be under 280 characters
- Sound authentic and conversational
- Highlight meaningful progress (not routine tasks)
- Include relevant hashtags (1-2 max)
- Match the developer's preferred style: ${style}
- Not use emojis excessively (1-2 max)

Context about recent activity:
${context}
`;

    let retries = 0;
    
    while (true) {
      try {
        // Enforce rate limiting
        await this.rateLimit();
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are an expert at crafting engaging tweets for developers building in public." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        // Extract and clean the generated tweet text
        const generatedText = response.choices[0]?.message?.content?.trim() || "";
        
        // Remove quotes if API returned them
        return generatedText.replace(/^["'](.*)["']$/s, '$1');
      } catch (error: any) {
        // Check if we should retry
        if (retries < this.maxRetries && this.isRetryableError(error)) {
          retries++;
          console.warn(`Retrying OpenAI request (${retries}/${this.maxRetries}) after error: ${error.message}`);
          
          // Exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, retries - 1));
          continue; // Try again
        }
        
        // Log error details
        console.error("OpenAI API error:", {
          error: error.message,
          type: error.type,
          code: error.status || error.code,
          stack: error.stack
        });
        
        throw error;
      }
    }
  }
  
  /**
   * Generate fallback content when OpenAI fails
   */
  private generateFallbackContent(repository: string, activities: any[]): string {
    const repoName = repository.split('/')[1];
    const commitCount = activities.filter(a => a.type === 'commit').length;
    const prCount = activities.filter(a => a.type === 'pull_request').length;
    const issueCount = activities.filter(a => a.type === 'issue').length;
    
    // Create a simple summary
    let text = `Just made progress on ${repoName}! `;
    
    if (commitCount > 0) {
      text += `${commitCount} commit${commitCount > 1 ? 's' : ''}`;
      if (prCount > 0 || issueCount > 0) text += ', ';
    }
    
    if (prCount > 0) {
      text += `${prCount} PR${prCount > 1 ? 's' : ''}`;
      if (issueCount > 0) text += ', ';
    }
    
    if (issueCount > 0) {
      text += `${issueCount} issue${issueCount > 1 ? 's' : ''}`;
    }
    
    text += ` #coding #github`;
    
    return text;
  }
  
  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // OpenAI specific error types that might be temporary
    if (error.type === 'server_error' || error.type === 'rate_limit_exceeded') {
      return true;
    }
    
    // 429 (rate limit) and 5xx (server errors) are retryable
    if (error.status) {
      return error.status === 429 || (error.status >= 500 && error.status < 600);
    }
    
    return false;
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