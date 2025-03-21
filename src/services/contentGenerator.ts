import 'openai/shims/node';
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Activity, IActivity } from "../models/Activity";
import { Content, IContent } from "../models/Content";
import { User } from "../models/User";
import { formatDistanceToNow } from "date-fns";
import fs from 'fs';
import path from 'path';
import { GitHubContextService } from "./githubContextService";
import logger from "../utils/logger";

/**
 * Transitional logging helper - wraps the structured logger while we migrate
 * TODO: Replace direct calls to this function with direct calls to the logger
 */
function writeToLog(message: string): void {
  // Use the structured logger
  logger.info('AI', message);
}

/**
 * Available AI providers for content generation
 */
export type AIProvider = "openai" | "anthropic";

/**
 * Service for generating social media content from GitHub activities
 */
export class ContentGenerator {
  private userId: string;
  private contentStyle: string;
  private provider: string; // 'openai' or 'anthropic'
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private maxRetries = 3;
  private retryDelay = 1000; // ms
  private lastRequestTime: number;
  private rateLimitWindowMs: number;

  /**
   * Initialize the content generator
   */
  constructor(
    userId: string, 
    contentStyle: string = "professional",
    options: {
      maxRetries?: number,
      retryDelay?: number,
      rateLimitWindowMs?: number,
      provider?: AIProvider
    } = {}
  ) {
    this.userId = userId;
    this.contentStyle = contentStyle;
    this.provider = options.provider || 'anthropic';
    
    // Try to create a test log file immediately to verify permissions
    try {
      fs.writeFileSync('./initialize-test.log', `ContentGenerator initialized at ${new Date().toISOString()} for user ${userId}\n`);
      console.log('Successfully created test log file');
    } catch (error) {
      console.error('FAILED TO CREATE TEST LOG FILE:', error);
    }
    
    // Initialize OpenAI if that's the provider
    if (this.provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    // Initialize Anthropic if that's the provider
    if (this.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
    
    // Set defaults for retry and rate limiting
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.rateLimitWindowMs = options.rateLimitWindowMs || 1000; // Minimum time between requests
    this.lastRequestTime = 0;
    
    // Validate that the selected provider is available
    this.validateProvider();
  }
  
  /**
   * Validate that the selected provider is available
   */
  private validateProvider(): void {
    if (this.provider === "openai" && !this.openai) {
      console.warn("OpenAI provider selected but no API key available. Please set OPENAI_API_KEY.");
      if (this.anthropic) {
        console.log("Falling back to Anthropic provider.");
        this.provider = "anthropic";
      }
    } else if (this.provider === "anthropic" && !this.anthropic) {
      console.warn("Anthropic provider selected but no API key available. Please set ANTHROPIC_API_KEY.");
      if (this.openai) {
        console.log("Falling back to OpenAI provider.");
        this.provider = "openai";
      }
    }
    
    if (!this.openai && !this.anthropic) {
      throw new Error("No AI provider available. Please set either OPENAI_API_KEY or ANTHROPIC_API_KEY.");
    }
  }

  /**
   * Generate content using the AI provider with retry logic
   */
  private async generateWithRetry(prompt: string, attempts = 0): Promise<string | null> {
    try {
      if (attempts >= this.maxRetries) {
        console.warn('Max retries reached for AI generation');
        return null;
      }
      
      // Try to generate using OpenAI if configured
      if (this.provider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant that creates engaging social media content.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
        
        return response.choices[0]?.message?.content || null;
      }
      
      // Try to generate using Anthropic if configured
      if (this.provider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-7-sonnet-20250219',
          system: 'You are an AI assistant whose ONLY job is to follow the user\'s instructions EXACTLY AS GIVEN. When asked to create content like an announcement or tweet, don\'t add any framing like \'here\'s a tweet\' - just write the content they asked for directly. The user will ALWAYS provide clear instructions about what to write - your job is to follow those instructions precisely without adding your own structure or embellishments.',
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300
        });
        
        // Access the content safely
        if (response.content && response.content[0] && 'text' in response.content[0]) {
          return response.content[0].text || null;
        }
        return null;
      }
      
      console.warn(`No AI provider available (configured provider: ${this.provider})`);
      return null;
    } catch (error) {
      console.error('Error generating AI content:', error);
      
      // Add exponential backoff
      const delay = this.retryDelay * Math.pow(2, attempts);
      console.log(`Retrying AI generation in ${delay}ms (attempt ${attempts + 1}/${this.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.generateWithRetry(prompt, attempts + 1);
    }
  }

  /**
   * Generate a tweet text from a specific GitHub activity using AI
   */
  private async generateTweetFromActivity(activity: IActivity): Promise<string> {
    try {
      console.log(`Generating tweet content for activity: ${activity.title}`);
      
      // Prepare prompt for AI based on the activity
      const prompt = this.prepareTweetPromptForActivity(activity);
      
      // Generate tweet
      const completionResult = await this.generateWithRetry(prompt);
      
      if (completionResult) {
        // Check if text exceeds Twitter's character limit (280)
        let tweetText = completionResult.trim();
        if (tweetText.length > 280) {
          tweetText = tweetText.substring(0, 277) + '...';
        }
        return tweetText;
      }
      
      // Fallback to template-based content if AI fails
      return this.generateFallbackTweetForActivity(activity);
    } catch (error) {
      console.error('Error generating tweet from activity:', error);
      return this.generateFallbackTweetForActivity(activity);
    }
  }
  
  /**
   * Prepare a prompt for generating a tweet based on the activity
   */
  private prepareTweetPromptForActivity(activity: IActivity): string {
    const activityType = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
    
    // Extract the project name from the repo
    const projectName = activity.repo.split('/')[1] || activity.repo;
    
    const prompt = `
You are a technical social media manager for a developer sharing their work on DevCast, a build-in-public agent that connects GitHub activities to social media.

Create an engaging tweet about a GitHub ${activityType.toLowerCase()} in the ${projectName} project with the following details:

Repository: ${activity.repo}
Title: ${activity.title}
${activity.description ? `Description: ${activity.description}` : ''}

The tweet should:
- Be under 280 characters
- Highlight the impact or significance of this specific activity
- Use a ${this.contentStyle} tone that sounds authentic
- Include 1-2 relevant hashtags that would reach the right developer audience
- Mention specific technologies or features if they appear in the title/description
- Avoid generic phrases like "Check out my latest commit"

About DevCast:
DevCast helps developers share their coding journey with their audience by automatically tracking GitHub activities and creating social updates.

Write only the tweet text, without quotation marks:
`;
    
    return prompt;
  }
  
  /**
   * Generate a fallback tweet when AI generation fails
   */
  private generateFallbackTweetForActivity(activity: IActivity): string {
    const emoji = this.getEmojiForActivityType(activity.type);
    const hashtags = `#GitHub #${activity.repo.replace(/-/g, '')} #${activity.type}`;
    
    // Simple template-based fallback
    return `${emoji} Just ${activity.type === 'commit' ? 'committed' : 'created a ' + activity.type} in ${activity.repo}: "${activity.title.substring(0, 100)}${activity.title.length > 100 ? '...' : ''}" ${hashtags}`;
  }
  
  /**
   * Get an appropriate emoji for the activity type
   */
  private getEmojiForActivityType(type: string): string {
    switch (type) {
      case 'commit':
        return '💻';
      case 'pr':
        return '🔀';
      case 'issue':
        return '🐛';
      case 'release':
        return '🚀';
      default:
        return '✨';
    }
  }

  /**
   * Generate social media content directly from a specific activity
   */
  async generateContentFromActivity(activity: IActivity): Promise<IContent | null> {
    try {
      console.log(`Generating content for activity: ${activity.title}`);
      
      // Create a content object
      const content = new Content({
        user: this.userId,
        relatedActivities: [activity._id],
        text: '', // Will be populated by AI
        status: 'pending',
        platform: 'twitter'
      });
      
      // Prepare content text
      const contentText = await this.generateTweetFromActivity(activity);
      content.text = contentText;
      
      // Save the content
      await content.save();
      
      // Mark activity as processed
      activity.status = 'processed';
      activity.processedAt = new Date();
      await activity.save();
      
      return content;
    } catch (error) {
      console.error("Error generating content from activity:", error);
      return null;
    }
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
      // Determine repository name - handle different data structures
      let repoName;
      
      if (activity.repo) {
        // Direct property schema (standard format)
        repoName = activity.repo;
      } else if (activity.repository) {
        // Alternative property name
        repoName = activity.repository;
      } else if (activity.data?.repository) {
        // Nested data schema (from test activities)
        repoName = `ssaulgoodman/${activity.data.repository}`;
      } else {
        // No repository found, use default
        repoName = "ssaulgoodman/devcast";
      }
      
      // Create array for this repository if it doesn't exist
      if (!groupedActivities[repoName]) {
        groupedActivities[repoName] = [];
      }
      
      groupedActivities[repoName].push(activity);
    }
    
    return groupedActivities;
  }

  /**
   * Generate content for a specific repository
   */
  async generateContentForRepository(
    repository: string,
    activities: any[]
  ): Promise<IContent> {
    try {
      // Get user for voice customization
      const user = await User.findById(this.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Get user's preferred AI provider if set
      const userPreferredProvider = user.settings?.aiProvider;
      if (userPreferredProvider && userPreferredProvider !== this.provider) {
        // Check if the user's preferred provider is available
        if ((userPreferredProvider === "openai" && this.openai) || 
            (userPreferredProvider === "anthropic" && this.anthropic)) {
          console.log(`Switching to user's preferred provider: ${userPreferredProvider}`);
          this.provider = userPreferredProvider;
        }
      }

      // Prepare context for AI
      const context = this.prepareActivityContext(repository, activities);
      
      // Generate content using the selected AI provider
      const generatedText = await this.generateTextWithAI(
        context, 
        user.settings.contentStyle || this.contentStyle
      );

      // Create the content record
      const content = await Content.create({
        user: this.userId,
        relatedActivities: activities.map(a => a._id),
        text: generatedText,
        originalText: generatedText,
        status: "pending",
        platform: "twitter",
        metadata: {
          generatedBy: this.provider
        }
      });

      // Update activity status to 'processed'
      if (activities.length > 0) {
        try {
          const activityIds = activities.map(a => a._id);
          await Activity.updateMany(
            { _id: { $in: activityIds } },
            { 
              $set: { 
                status: 'processed',
                processedAt: new Date()
              } 
            }
          );
          console.log(`Updated ${activityIds.length} activities to 'processed' status`);
        } catch (activityError) {
          console.error(`Error updating activities status: ${activityError instanceof Error ? activityError.message : String(activityError)}`);
        }
      }

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

      // Even with errors, we update activity status to 'processed'
      if (activities.length > 0) {
        try {
          const activityIds = activities.map(a => a._id);
          await Activity.updateMany(
            { _id: { $in: activityIds } },
            { 
              $set: { 
                status: 'processed',
                processedAt: new Date()
              } 
            }
          );
          console.log(`Updated ${activityIds.length} activities to 'processed' status even after error`);
        } catch (activityError) {
          console.error(`Error updating activities status: ${activityError instanceof Error ? activityError.message : String(activityError)}`);
        }
      }
      
      return content;
    }
  }

  /**
   * Prepare context information for AI
   */
  private prepareActivityContext(repository: string, activities: any[]): string {
    // Extract repo name safely
    const repoName = repository.includes('/') ? repository.split('/')[1] : repository;
    
    // Count activity types - handle both direct types and data.type
    const commitCount = activities.filter(a => 
      a.type === 'commit' || a.data?.type === 'commit'
    ).length;
    
    const prCount = activities.filter(a => 
      a.type === 'pull_request' || a.type === 'pr' || a.data?.type === 'pull_request' || a.data?.type === 'pr'
    ).length;
    
    const issueCount = activities.filter(a => 
      a.type === 'issue' || a.data?.type === 'issue'
    ).length;
    
    // Get the most recent activity for time reference
    const mostRecentActivity = [...activities].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    
    let timeAgo = "recently";
    try {
      timeAgo = formatDistanceToNow(new Date(mostRecentActivity.createdAt), { addSuffix: true });
    } catch (error) {
      console.error("Error formatting time:", error);
    }
    
    // Format activity details - handle different data structures
    const activityDetails = activities.map(activity => {
      // Determine activity type
      let type = activity.type || activity.data?.type || "activity";
      type = type.toUpperCase();
      
      // Determine title
      let title = activity.title || activity.data?.title || activity.data?.message || "Untitled activity";
      
      // Get description if available
      let description = activity.description || activity.data?.description || "";
      
      // Create detail line
      let detail = `- [${type}] ${title}`;
      
      if (description && description.trim()) {
        // Include truncated description if available
        const desc = description.trim().split('\n')[0];
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
   * Generate text using the selected AI provider
   */
  private async generateTextWithAI(context: string, style: string): Promise<{ text: string, debug: string }> {
    // Get prompt with consistent format for both providers
    const prompt = this.createPrompt(context, style);
    
    if (this.provider === "openai" && this.openai) {
      const response = await this.callOpenAI(prompt);
      return response;
    } else if (this.provider === "anthropic" && this.anthropic) {
      const response = await this.callAnthropic(prompt);
      return response;
    } else {
      throw new Error(`Selected provider ${this.provider} is not available`);
    }
  }
  
  /**
   * Create a consistent prompt for all AI providers
   */
  private createPrompt(context: string, style: string): string {
    return `
You are a technical social media manager for a developer who wants to share their coding journey through DevCast, a build-in-public agent that connects GitHub activities to social media updates.

Create an engaging tweet about their recent GitHub activity that highlights meaningful progress.

The tweet should:
- Be under 280 characters
- Sound authentic and conversational in a ${style} tone
- Focus on the impact or significance of the work (not just listing commits)
- Include 1-2 relevant hashtags that would reach the right developer audience
- Use at most 1-2 emojis appropriately
- Avoid generic phrases like "Check out my latest commit"
- Mention specific technologies or features if they appear in the activity titles

Context about recent GitHub activity:
${context}

About DevCast:
DevCast is a tool that helps developers share their coding journey with their audience by automatically generating social media content from their GitHub activities.

Write only the tweet text, without quotation marks:
`;
  }

  /**
   * Call OpenAI API to generate content
   */
  private async callOpenAI(prompt: string): Promise<{ text: string, debug: string }> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized");
    }

    let retries = 0;
    const debugInfo = `PROVIDER: openai\nMODEL: gpt-4o\nPROMPT: ${prompt.substring(0, 200)}...\n`;
    
    // Create a logging wrapper that uses our structured logger
    const directLog = (message: string) => {
      logger.debug('OPENAI', message);
    };
    
    directLog(`OpenAI request started with prompt: ${prompt.substring(0, 100)}...`);
    
    while (true) {
      try {
        // Rate limiting
        await this.rateLimit();
        
        console.log('Sending request to OpenAI');
        directLog('Sending request to OpenAI');
        
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "You are a helpful assistant that follows user instructions precisely." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        directLog(`OpenAI RESPONSE: ${JSON.stringify(completion, null, 2)}`);
        
        const generatedText = completion.choices[0]?.message?.content || '';
        console.log(`OpenAI response: "${generatedText}"`);
        directLog(`Raw text response: "${generatedText}"`);
        
        return { text: generatedText, debug: debugInfo };
      } catch (error: any) {
        // Check if we should retry
        if (retries < this.maxRetries && this.isRetryableError(error)) {
          retries++;
          console.warn(`Retrying OpenAI request (${retries}/${this.maxRetries}) after error: ${error.message}`);
          directLog(`Retrying OpenAI request (${retries}/${this.maxRetries}) after error: ${error.message}`);
          
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
        
        directLog(`OpenAI API error: ${error.message}, type: ${error.type || 'unknown'}, code: ${error.status || error.code || 'unknown'}`);
        
        throw error;
      }
    }
  }
  
  /**
   * Call Anthropic API to generate content
   */
  private async callAnthropic(prompt: string): Promise<{ text: string, debug: string }> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized");
    }

    let retries = 0;
    let debugInfo = `PROVIDER: Claude\nMODEL: claude-3-7-sonnet-20250219\n`;
    const systemPrompt = `You are an AI assistant whose ONLY job is to follow the user's instructions EXACTLY AS GIVEN. When asked to create content like an announcement or tweet, don't add any framing like 'here's a tweet' - just write the content they asked for directly. The user will ALWAYS provide clear instructions about what to write - your job is to follow those instructions precisely without adding your own structure or embellishments.`;
    
    // Create a logging wrapper that uses our structured logger
    const directLog = (message: string) => {
      logger.debug('CLAUDE', message);
    };
    
    directLog(`Claude request started with prompt: ${prompt.substring(0, 100)}...`);
    
    // Create a reference for this request for tracking
    const requestId = Date.now().toString();
    const requestLogFile = `claude-request-${requestId}.log`;
    
    while (true) {
      try {
        // Rate limiting
        await this.rateLimit();
        
        // Log the complete prompt being sent to Claude
        console.log('=========== CLAUDE REQUEST START ===========');
        console.log('SYSTEM PROMPT:');
        console.log(systemPrompt);
        console.log('\nUSER PROMPT:');
        console.log(prompt);
        console.log('============ CLAUDE REQUEST END ============');
        
        debugInfo += `PROVIDER: Claude\nMODEL: claude-3-7-sonnet-20250219\n\nSYSTEM PROMPT:\n${systemPrompt}\n\nUSER PROMPT:\n${prompt}\n\n`;
        
        // Log directly to file
        directLog('CLAUDE REQUEST:');
        directLog(`SYSTEM PROMPT: ${systemPrompt}`);
        directLog(`USER PROMPT: ${prompt}`);
        
        // Write to the request-specific log file
        try {
          fs.appendFileSync(requestLogFile, `TIME: ${new Date().toISOString()}\n`);
          fs.appendFileSync(requestLogFile, `SYSTEM PROMPT: ${systemPrompt}\n\n`);
          fs.appendFileSync(requestLogFile, `USER PROMPT: ${prompt}\n\n`);
        } catch (error) {
          console.error(`Failed to write to request log file ${requestLogFile}:`, error);
        }
        
        // Write to log file using the helper function
        writeToLog('=========== CLAUDE REQUEST START ===========');
        writeToLog(`SYSTEM PROMPT:\n${systemPrompt}`);
        writeToLog(`USER PROMPT:\n${prompt}`);
        writeToLog('============ CLAUDE REQUEST END ============');
        
        // Only now make the actual API call
        const response = await this.anthropic.messages.create({
          model: "claude-3-7-sonnet-20250219",
          system: systemPrompt,
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 300,
        });

        // Log the complete raw response from Claude
        console.log('=========== CLAUDE RESPONSE START ===========');
        console.log(JSON.stringify(response, null, 2));
        console.log('============ CLAUDE RESPONSE END ============');

        // Immediately log response to the request-specific file
        try {
          const responseStr = JSON.stringify(response, null, 2);
          fs.appendFileSync(requestLogFile, `RESPONSE:\n${responseStr}\n\n`);
        } catch (error) {
          console.error(`Failed to write response to request log file ${requestLogFile}:`, error);
        }

        // Log directly to file
        directLog('CLAUDE RESPONSE:');
        directLog(JSON.stringify(response, null, 2));
        
        // Write to log file using the helper function
        writeToLog('=========== CLAUDE RESPONSE START ===========');
        writeToLog(JSON.stringify(response, null, 2));
        writeToLog('============ CLAUDE RESPONSE END ============');

        // Extract and clean the generated tweet text
        let generatedText = response.content[0]?.type === 'text' 
          ? response.content[0].text 
          : '';
        
        debugInfo += `RAW RESPONSE:\n${generatedText}\n\n`;
        console.log(`Raw Claude text response: "${generatedText}"`);
        directLog(`Raw Claude text response: "${generatedText}"`);
        writeToLog(`Raw Claude text response: "${generatedText}"`);
        
        // Remove quotes if API returned them
        generatedText = generatedText.trim().replace(/^["'](.*)["']$/s, '$1');
        
        // Check for common prefixes and remove them
        const prefixesToRemove = [
          "Here's a tweet",
          "Here's an announcement",
          "Here is a tweet",
          "Here is an announcement",
          "Tweet:",
          "Announcement:",
          "Here's what you requested:",
          "As requested:",
          "Here's the announcement", 
          "Here's the content",
          "Based on your instructions",
          "As per your request"
        ];
        
        let prefixRemoved = false;
        for (const prefix of prefixesToRemove) {
          if (generatedText.toLowerCase().startsWith(prefix.toLowerCase())) {
            generatedText = generatedText.substring(prefix.length).trim();
            // Remove any trailing or leading colons or spaces
            generatedText = generatedText.replace(/^[: ]+|[: ]+$/g, '');
            console.log(`Removed prefix "${prefix}"`);
            directLog(`Removed prefix "${prefix}"`);
            writeToLog(`Removed prefix "${prefix}"`);
            debugInfo += `REMOVED PREFIX: "${prefix}"\n`;
            prefixRemoved = true;
            break;
          }
        }
        
        // Check if the generated text repeats the instruction
        const promptPhrases = prompt.split(/[,.!?;:]/g)
          .map(phrase => phrase.trim())
          .filter(phrase => phrase.length > 10)
          .map(phrase => phrase.toLowerCase());
          
        let phraseRemoved = false;
        for (const phrase of promptPhrases) {
          if (generatedText.toLowerCase().startsWith(phrase)) {
            // Remove the instruction phrase if it appears at the beginning
            const originalText = generatedText;
            generatedText = generatedText.substring(phrase.length).trim();
            generatedText = generatedText.replace(/^[:"' ]+/, '');
            console.log(`Removed instruction phrase from beginning: "${phrase}"`);
            directLog(`Removed instruction phrase from beginning: "${phrase}"`);
            writeToLog(`Removed instruction phrase from beginning: "${phrase}"`);
            debugInfo += `REMOVED INSTRUCTION PHRASE: "${phrase}"\n`;
            phraseRemoved = true;
            break;
          }
        }
        
        console.log(`Final cleaned response: "${generatedText}"`);
        directLog(`Final cleaned response: "${generatedText}"`);
        writeToLog(`Final cleaned response: "${generatedText}"`);
        debugInfo += `CLEANED RESPONSE:\n${generatedText}\n`;
        debugInfo += `CLEANING ACTIONS: ${prefixRemoved || phraseRemoved ? 'Applied text cleaning' : 'No cleaning needed'}\n`;
        
        return { text: generatedText, debug: debugInfo };
      } catch (error: any) {
        // Check if we should retry
        if (retries < this.maxRetries && this.isRetryableError(error)) {
          retries++;
          console.warn(`Retrying Anthropic request (${retries}/${this.maxRetries}) after error: ${error.message}`);
          directLog(`Retrying Anthropic request (${retries}/${this.maxRetries}) after error: ${error.message}`);
          writeToLog(`Retrying Anthropic request (${retries}/${this.maxRetries}) after error: ${error.message}`);
          
          // Exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, retries - 1));
          continue; // Try again
        }
        
        // Log error details
        console.error("Anthropic API error:", {
          error: error.message,
          type: error.type,
          code: error.status || error.code,
          stack: error.stack
        });
        
        directLog(`Anthropic API error: ${error.message}, type: ${error.type}, code: ${error.status || error.code}`);
        writeToLog(`Anthropic API error: ${error.message}, type: ${error.type}, code: ${error.status || error.code}`);
        
        throw error;
      }
    }
  }
  
  /**
   * Generate fallback content when AI providers fail
   */
  private generateFallbackContent(repository: string, activities: any[]): string {
    // Handle missing repository by providing a default name
    const repoName = repository && repository !== 'undefined' 
      ? (repository.split('/')[1] || repository)
      : 'my project';
      
    const commitCount = activities.filter(a => a.type === 'commit').length;
    const prCount = activities.filter(a => a.type === 'pull_request' || a.type === 'pr').length;
    const issueCount = activities.filter(a => a.type === 'issue').length;
    const releaseCount = activities.filter(a => a.type === 'release').length;
    
    // Get the most recent activity titles (up to 2)
    const recentTitles = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 2)
      .map(a => a.title?.substring(0, 40))
      .filter(Boolean);
    
    // Create a more specific and meaningful summary
    let text = `Just made progress on ${repoName}! `;
    
    // Mention specific activity types
    if (releaseCount > 0) {
      text += `🚀 Released v${activities.find(a => a.type === 'release')?.title?.match(/v?(\d+\.\d+\.\d+)/)?.[1] || 'new version'}. `;
    } else {
      const activityTypes = [];
      
      if (commitCount > 0) activityTypes.push(`${commitCount} commit${commitCount > 1 ? 's' : ''}`);
      if (prCount > 0) activityTypes.push(`${prCount} PR${prCount > 1 ? 's' : ''}`);
      if (issueCount > 0) activityTypes.push(`${issueCount} issue${issueCount > 1 ? 's' : ''}`);
      
      if (activityTypes.length > 0) {
        text += `Added ${activityTypes.join(', ')}. `;
      }
    }
    
    // Add recent activity titles if available
    if (recentTitles.length > 0) {
      text += `Latest: ${recentTitles[0]}`;
      if (recentTitles.length > 1) {
        text += ` and more`;
      }
      text += `. `;
    }
    
    // Add hashtags - avoid undefined in hashtags
    text += `#${repoName !== 'my project' 
      ? repoName.toLowerCase().replace(/[^a-z0-9]/g, '') 
      : 'coding'} #devwork`;
    
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
    
    // API specific error types that might be temporary
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

  /**
   * Generate content with specific user instructions
   */
  async generateContentWithInstructions(instructions: string): Promise<IContent | null> {
    try {
      // Get user for voice customization
      const user = await User.findById(this.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Get user's preferred AI provider if set
      const userPreferredProvider = user.settings?.aiProvider;
      if (userPreferredProvider && userPreferredProvider !== this.provider) {
        // Check if the user's preferred provider is available
        if ((userPreferredProvider === "openai" && this.openai) || 
            (userPreferredProvider === "anthropic" && this.anthropic)) {
          console.log(`Switching to user's preferred provider: ${userPreferredProvider}`);
          this.provider = userPreferredProvider;
        }
      }

      // Get recent activities to provide context
      const recentActivities = await Activity.find({
        $or: [
          { user: this.userId },
          { userId: this.userId }
        ],
        status: { $in: ['pending', 'processed'] }
      })
      .sort({ createdAt: -1 })
      .limit(10);

      if (recentActivities.length === 0) {
        throw new Error("No recent activities found to provide context");
      }

      // Group activities by repository for better context
      const activitiesByRepo = this.groupActivitiesByRepository(recentActivities);
      
      // Get the most recent repository
      const mostRecentRepo = Object.entries(activitiesByRepo).sort(
        ([, a], [, b]) => 
          new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime()
      )[0];

      if (!mostRecentRepo) {
        throw new Error("Could not determine repository context");
      }

      const [repoName, repoActivities] = mostRecentRepo;
      
      // Prepare context for AI based on the most recent repository
      const context = this.prepareActivityContext(repoName, repoActivities);
      
      // Generate content using the selected AI provider with user instructions
      const { text, debug } = await this.generateTextWithInstructionsAI(
        context,
        instructions,
        user.settings.contentStyle || this.contentStyle
      );

      // Create the content record
      const content = await Content.create({
        user: this.userId,
        relatedActivities: repoActivities.map(a => a._id),
        text: text,
        originalText: text,
        status: "pending",
        platform: "twitter",
        metadata: {
          generatedBy: this.provider,
          instructions: instructions,
          debug: debug
        }
      });

      return content;
    } catch (error) {
      console.error("Error generating content with instructions:", error);
      
      try {
        // Get recent activities again if needed
        const recentActivities = await Activity.find({
          $or: [
            { user: this.userId },
            { userId: this.userId }
          ],
          status: { $in: ['pending', 'processed'] }
        })
        .sort({ createdAt: -1 })
        .limit(10);
        
        if (recentActivities.length === 0) {
          return null;
        }
        
        // Group activities by repository
        const activitiesByRepo = this.groupActivitiesByRepository(recentActivities);
        
        // Get the most recent repository
        const mostRecentRepo = Object.entries(activitiesByRepo).sort(
          ([, a], [, b]) => 
            new Date(b[0].createdAt).getTime() - new Date(a[0].createdAt).getTime()
        )[0];
        
        if (!mostRecentRepo) {
          return null;
        }
        
        const [repoName, repoActivities] = mostRecentRepo;
        
        console.log(`Creating fallback content with instruction: "${instructions}"`);
        
        // Generate fallback content that tries to follow the instruction
        let fallbackText = "";
        
        // Start with a prefix based on the instruction if possible
        if (instructions && instructions.trim().length > 0) {
          // Extract the essence of the instruction
          if (instructions.toLowerCase().includes("tweet about")) {
            fallbackText = `Tweet about ${repoName.split('/')[1] || repoName}: `;
          } else if (instructions.toLowerCase().includes("post about")) {
            fallbackText = `Post about ${repoName.split('/')[1] || repoName}: `;
          } else {
            // Try to use the instruction directly
            fallbackText = `${instructions.charAt(0).toUpperCase() + instructions.slice(1)}: `;
          }
        }
        
        // Add basic activity information
        fallbackText += this.generateFallbackContent(repoName, repoActivities);
        
        // Ensure the fallback text isn't too long
        if (fallbackText.length > 280) {
          fallbackText = fallbackText.substring(0, 277) + "...";
        }
        
        console.log(`Fallback text: "${fallbackText}"`);
        
        // Create a fallback content record
        const content = await Content.create({
          user: this.userId,
          relatedActivities: repoActivities.map(a => a._id),
          text: fallbackText,
          originalText: fallbackText,
          status: "pending",
          platform: "twitter",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            generatedByFallback: true,
            originalInstructions: instructions
          }
        });
        
        return content;
      } catch (fallbackError) {
        console.error("Error generating fallback content:", fallbackError);
        return null;
      }
    }
  }

  /**
   * Generate text with specific instructions using the selected AI provider
   */
  private async generateTextWithInstructionsAI(
    context: string, 
    instructions: string,
    style: string
  ): Promise<{ text: string, debug: string }> {
    console.log(`Generating content with instructions: "${instructions}"`);
    
    try {
      // Extract repo information from context to enrich with GitHub details
      const repoMatch = context.match(/Repository: ([^/\n]+)\/([^\n]+)/);
      let enhancedContext = context;
      let githubContextInfo = null;
      
      // Add debug info for logging
      let debugInfo = `PROVIDER: ${this.provider}\n`;
      
      // If we can identify the repository, add GitHub context
      if (repoMatch && repoMatch.length >= 3) {
        const [_, owner, repo] = repoMatch;
        
        // Get the GitHub token from the user
        const user = await User.findById(this.userId);
        if (user && user.github && user.github.accessToken) {
          try {
            debugInfo += `Fetching GitHub context for ${owner}/${repo}...\n`;
            
            // Get enhanced context from GitHub
            const githubContext = new GitHubContextService(user.github.accessToken);
            const repoContext = await githubContext.getRepositoryContext(owner, repo.trim());
            
            if (repoContext) {
              githubContextInfo = repoContext;
              debugInfo += `Successfully fetched GitHub context\n`;
              
              // Add repository context to enhance the prompt
              enhancedContext += `\n\nRepository Details:\n`;
              enhancedContext += `Name: ${repoContext.name}\n`;
              enhancedContext += `Description: ${repoContext.description || 'N/A'}\n`;
              enhancedContext += `Main Language: ${repoContext.language || 'N/A'}\n`;
              enhancedContext += `Topics: ${(repoContext.topics || []).join(', ') || 'N/A'}\n`;
              enhancedContext += `Stars: ${repoContext.stars}, Forks: ${repoContext.forks}\n`;
              
              // Add recent releases if available
              if (repoContext.releases && repoContext.releases.length > 0) {
                enhancedContext += `\nRecent Releases:\n`;
                repoContext.releases.slice(0, 2).forEach((release: { tagName?: string; name?: string; body?: string }) => {
                  enhancedContext += `- ${release.tagName || release.name}: ${release.body ? release.body.substring(0, 100) + '...' : 'No description'}\n`;
                });
              }
              
              // Add recent issues if available
              if (repoContext.recentIssues && repoContext.recentIssues.length > 0) {
                enhancedContext += `\nRecent Issues:\n`;
                repoContext.recentIssues.slice(0, 3).forEach((issue: { number: number; title: string }) => {
                  enhancedContext += `- #${issue.number}: ${issue.title}\n`;
                });
              }
              
              // Add README excerpt
              if (repoContext.readme) {
                enhancedContext += `\nREADME Excerpt:\n${repoContext.readme}\n`;
              }
            } else {
              debugInfo += `Could not fetch GitHub context\n`;
            }
          } catch (error: unknown) {
            console.error('Error getting GitHub context:', error);
            debugInfo += `Error fetching GitHub context: ${error instanceof Error ? error.message : String(error)}\n`;
          }
        } else {
          debugInfo += `No GitHub token available for user ${this.userId}\n`;
        }
      } else {
        debugInfo += `Could not extract repository information from context\n`;
      }
      
      // Create the enhanced prompt
      const prompt = this.createInstructionsPrompt(enhancedContext, instructions, style);
      
      // Store the GitHub context in the debug info
      if (githubContextInfo) {
        debugInfo += `\nGITHUB_CONTEXT_SUMMARY:\n`;
        debugInfo += `Repository: ${githubContextInfo.fullName}\n`;
        debugInfo += `Description: ${githubContextInfo.description || 'N/A'}\n`;
        debugInfo += `Language: ${githubContextInfo.language}, Stars: ${githubContextInfo.stars}\n`;
        debugInfo += `Topics: ${(githubContextInfo.topics || []).join(', ') || 'N/A'}\n`;
      }
      
      if (this.provider === "openai" && this.openai) {
        const response = await this.callOpenAI(prompt);
        return {
          text: response.text,
          debug: debugInfo + '\n' + response.debug
        };
      } else if (this.provider === "anthropic" && this.anthropic) {
        const response = await this.callAnthropic(prompt);
        return {
          text: response.text,
          debug: debugInfo + '\n' + response.debug
        };
      } else {
        throw new Error(`Selected provider ${this.provider} is not available`);
      }
    } catch (error) {
      console.error("Error generating with instructions:", error);
      throw error;
    }
  }
  
  /**
   * Create a prompt that includes user instructions
   */
  private createInstructionsPrompt(
    context: string, 
    instructions: string,
    style: string
  ): string {
    console.log(`Creating instructions prompt with: "${instructions}"`);
    
    // Remove any quotes around the instruction if present
    const cleanedInstructions = instructions.replace(/^["']+|["']+$/g, '');
    
    // Make the prompt as direct and clear as possible
    return `
WRITE THE FOLLOWING CONTENT: ${cleanedInstructions}

IMPORTANT FORMATTING INSTRUCTIONS:
1. Generate ONLY the exact content - no introductions, no explanations
2. DO NOT include phrases like "Here's a tweet" or "Announcement for"
3. DO NOT repeat the instruction itself in your response
4. DO NOT say "As requested" or anything similar
5. DO NOT echo my request back to me
6. Just write the content directly

FORMAT REQUIREMENTS:
- Maximum 280 characters
- Include 1-2 relevant hashtags
- ${style} tone

You have this context available (ONLY use if directly relevant):
${context}

JUST WRITE THE ACTUAL CONTENT WITH NO EXTRA TEXT:
`;
  }
} 
