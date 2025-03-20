import { User } from "@/models/User";
import { Content } from "@/models/Content";
import { GitHubService } from "./githubService";
import { ContentGenerator } from "./contentGenerator";
import { TwitterService } from "./twitterService";
import { TelegramService } from "./telegramService";

/**
 * Service for scheduling and running automated jobs
 */
export class Scheduler {
  private telegramService: TelegramService;

  constructor() {
    this.telegramService = new TelegramService();
  }

  /**
   * Run all scheduled jobs in sequence
   */
  async runAllJobs(): Promise<void> {
    try {
      // Run jobs in sequence
      await this.syncAllUsersActivities();
      await this.generateContentForAllUsers();
      await this.postApprovedContent();
      await this.updateContentAnalytics();
      
      console.log('All scheduled jobs completed successfully');
    } catch (error) {
      console.error('Error running all scheduled jobs:', error);
      throw error;
    }
  }

  /**
   * Sync GitHub activities for all users
   */
  async syncAllUsersActivities(): Promise<void> {
    try {
      // Get all users with GitHub access tokens
      const users = await User.find({
        'github.accessToken': { $exists: true, $ne: null }
      });
      
      console.log(`Found ${users.length} users with GitHub tokens`);
      
      // Sync activities for each user
      for (const user of users) {
        try {
          // Skip users without GitHub token
          if (!user.github?.accessToken) {
            console.log(`No GitHub token for user ${user._id}, skipping sync`);
            continue;
          }
          
          const githubService = new GitHubService(
            user.github.accessToken as string,
            (user._id as any).toString()
          );
          
          const activitiesCount = await githubService.syncUserActivities();
          console.log(`Synced ${activitiesCount} GitHub activities for user ${user._id}`);
        } catch (error) {
          console.error(`Error syncing activities for user ${user._id}:`, error);
          // Continue with the next user
        }
      }
      
      console.log('GitHub activity sync completed');
    } catch (error) {
      console.error('Error syncing GitHub activities:', error);
      throw error;
    }
  }

  /**
   * Generate content for all users with unprocessed activities
   */
  async generateContentForAllUsers(): Promise<void> {
    try {
      // Get all users with unprocessed activities
      const users = await User.find();
      
      console.log(`Generating content for ${users.length} users`);
      
      // Generate content for each user
      for (const user of users) {
        try {
          // Only generate content if the user has settings configured
          if (user.settings) {
            const contentGenerator = new ContentGenerator(
              (user._id as any).toString(),
              user.settings.contentStyle || 'professional'
            );
            
            // Try to generate content
            const content = await contentGenerator.generateContent();
            
            if (content) {
              // If user has auto-approve enabled, mark content as approved
              if (user.settings.autoApprove) {
                content.status = 'approved';
                await content.save();
                console.log(`Auto-approved content for user ${(user._id as any).toString()}`);
              } 
              // Otherwise, if telegram integration exists, send for approval
              else if (user.telegram?.chatId) {
                // Send to Telegram for approval
                // Note: In a real implementation, this would use telegram service
                console.log(`Sent content for approval via Telegram to user ${(user._id as any).toString()}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error generating content for user ${(user._id as any).toString()}:`, error);
          // Continue with next user
        }
      }
      
      console.log('Content generation completed');
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Post approved content to social media
   */
  async postApprovedContent(): Promise<void> {
    try {
      // Get all approved content
      const contents = await Content.find({
        status: { $in: ['approved', 'edited'] },
        postedAt: { $exists: false }
      }).populate('user');
      
      console.log(`Found ${contents.length} pieces of content to post`);
      
      // Post each content
      for (const content of contents) {
        try {
          const user = content.user as any;
          
          // Only post if the user has Twitter token
          if (user.accessTokens?.twitter && user.accessTokens?.twitterSecret) {
            const twitterService = new TwitterService(
              user.accessTokens.twitter,
              user.accessTokens.twitterSecret
            );
            
            // Post to Twitter
            const result = await twitterService.postTweet(content);
            console.log(`Posted content ${content._id} to Twitter: ${result.url}`);
            
            // Send notification to user via Telegram if enabled
            if (user.settings?.enableTelegramNotifications && user.telegramChatId) {
              await this.telegramService.sendPostNotification(content);
              console.log(`Sent post notification to user ${user._id}`);
            }
          } else {
            console.log(`User ${user._id} does not have Twitter credentials, skipping posting`);
            // Update content status to indicate it couldn't be posted
            await Content.findByIdAndUpdate(content._id, { status: 'error', metadata: { error: 'Missing Twitter credentials' } });
          }
        } catch (error) {
          console.error(`Error posting content ${content._id}:`, error);
          // Continue with the next content
        }
      }
      
      console.log('Content posting completed');
    } catch (error) {
      console.error('Error posting content:', error);
      throw error;
    }
  }

  /**
   * Update analytics for posted content
   */
  async updateContentAnalytics(): Promise<void> {
    try {
      // Get all posted content that's not too old (less than 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const contents = await Content.find({
        status: 'posted',
        postedAt: { $gt: oneWeekAgo }
      }).populate('user');
      
      console.log(`Found ${contents.length} pieces of content to update analytics`);
      
      // Update analytics for each content
      for (const content of contents) {
        try {
          const user = content.user as any;
          
          if (content.postId && user.accessTokens?.twitter && user.accessTokens?.twitterSecret) {
            const twitterService = new TwitterService(
              user.accessTokens.twitter,
              user.accessTokens.twitterSecret
            );
            
            await twitterService.updateContentAnalytics(content);
            console.log(`Updated analytics for content ${content._id}`);
          }
        } catch (error) {
          console.error(`Error updating analytics for content ${content._id}:`, error);
          // Continue with the next content
        }
      }
      
      console.log('Analytics update completed');
    } catch (error) {
      console.error('Error updating analytics:', error);
      throw error;
    }
  }
} 