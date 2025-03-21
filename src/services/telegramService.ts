import TelegramBot from "node-telegram-bot-api";
import { Content, IContent } from "@/models/Content";
import { User, IUser } from "@/models/User";
import { Activity } from "@/models/Activity";
import mongoose, { Document } from "mongoose";
import { ContentGenerator } from "../services/contentGenerator";
import fs from 'fs';
import path from 'path';
import { TwitterService } from "./twitterService";
import logger from "@/utils/logger";

/**
 * Helper to safely get a MongoDB ObjectId from a document
 */
function getDocumentId(doc: any): string {
  if (!doc || !doc._id) return '';
  return doc._id.toString();
}

/**
 * Service for interacting with Telegram Bot API for content approval
 */
export class TelegramService {
  private bot: TelegramBot;
  
  /**
   * Initialize Telegram bot
   */
  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN as string;
    
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is required");
    }
    
    this.bot = new TelegramBot(token, { polling: false });
  }

  /**
   * Get the bot instance
   * @returns The Telegram bot instance
   */
  getBot(): TelegramBot {
    return this.bot;
  }

  /**
   * Stop the bot polling
   */
  stopPolling(): void {
    if (this.bot) {
      this.bot.stopPolling();
    }
  }

  /**
   * Start the bot polling
   */
  startPolling(): void {
    this.bot.startPolling();
    
    // Handle edit command
    this.bot.onText(/\/edit\s+(\w+)\s+(.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const contentId = match?.[1];
      const newText = match?.[2];
      
      if (!contentId || !newText) {
        await this.bot.sendMessage(
          chatId, 
          "Error: Please provide both content ID and new text. Format: /edit [id] [new text]"
        );
        return;
      }
      
      try {
        await this.editContent(contentId, newText, chatId);
      } catch (error: any) {
        await this.bot.sendMessage(chatId, `Error: ${error.message}`);
      }
    });
    
    // Handle start command for registration
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      await this.sendWelcomeMessage(chatId);
    });
    
    // Handle register command
    this.bot.onText(/\/register\s*/, async (msg) => {
      const chatId = msg.chat.id;
      // Just register with the user's Telegram info
      try {
        await this.registerOrLinkUser(chatId, msg.from?.username || null);
      } catch (error: any) {
        await this.bot.sendMessage(chatId, `Error: ${error.message}`);
      }
    });
    
    // General message handler for all other commands
    this.bot.on('message', async (msg) => {
      // Skip if not a command or already handled by specific handlers
      if (!msg.text || !msg.text.startsWith('/') || 
          msg.text.startsWith('/start') || 
          msg.text.startsWith('/register') || 
          msg.text.match(/^\/edit\s+\w+\s+.+/)) {
        return;
      }
      
      try {
        // Log incoming command
        logger.telegram.info(`Processing command: ${msg.text} from chat ID: ${msg.chat.id}`);
        
        // Handle command via the main command handler
        await this.handleCommand(msg);
      } catch (error: any) {
        logger.telegram.error(`Error handling command ${msg.text}: ${error.message}`, error);
        await this.bot.sendMessage(msg.chat.id, `Error processing command: ${error.message}`);
      }
    });
    
    // Handle callback queries
    this.bot.on('callback_query', async (callbackQuery) => {
      try {
        await this.handleCallback(callbackQuery);
      } catch (error: any) {
        logger.telegram.error('Error handling callback query:', error);
        if (callbackQuery.message) {
          await this.bot.sendMessage(
            callbackQuery.message.chat.id,
            `Error processing button: ${error.message}`
          );
        }
      }
    });
  }

  /**
   * Handle incoming webhook commands
   */
  async handleCommand(message: any): Promise<void> {
    const chatId = message.chat.id;
    const text = message.text;
    
    // Parse command and arguments
    const [command, ...args] = text.split(' ');
    
    try {
      switch (command) {
        case '/start':
          await this.sendWelcomeMessage(chatId);
          break;
          
        case '/register':
          // New register process that doesn't require a user ID
          await this.registerOrLinkUser(chatId, message.from.username || null);
          break;
          
        case '/approve':
          // Replace the approve command with a helpful message
          await this.bot.sendMessage(chatId, "To approve content, please use the ✅ Approve button on the content instead of using a command. Use /pending to view content waiting for approval.");
          break;
          
        case '/reject':
          // Replace the reject command with a helpful message
          await this.bot.sendMessage(chatId, "To reject content, please use the ❌ Reject button on the content instead of using a command. Use /pending to view content waiting for approval.");
          break;
          
        case '/edit':
          if (args.length < 2) {
            await this.bot.sendMessage(
              chatId,
              "Error: Both Content ID and new text are required. Usage: /edit CONTENT_ID your new text"
            );
          } else {
            const contentId = args[0];
            const newText = args.slice(1).join(' ');
            await this.editContent(contentId, newText, chatId);
          }
          break;
          
        case '/activities':
          await this.showRecentActivities(chatId);
          break;
          
        case '/pending':
          await this.showPendingContent(chatId);
          break;
          
        case '/approved':
          await this.showApprovedContent(chatId);
          break;
          
        case '/generate':
          // If no arguments, generate content from recent activities
          if (args.length === 0) {
            await this.generateContent(chatId);
          } else {
            // If arguments are provided, use them as instructions for content generation
            const instructions = args.join(' ');
            await this.generateContentWithInstructions(chatId, instructions);
          }
          break;
          
        case '/ai':
          if (args.length === 0) {
            await this.showAIProviderOptions(chatId);
          } else {
            await this.setAIProvider(args[0], chatId);
          }
          break;
          
        case '/help':
          await this.sendHelpMessage(chatId);
          break;
          
        default:
          await this.bot.sendMessage(
            chatId,
            "Unknown command. Type /help to see available commands."
          );
      }
    } catch (error: any) {
      logger.telegram.error('Error handling command:', error);
      await this.bot.sendMessage(chatId, `Error: ${error.message}`);
    }
  }
  
  /**
   * Handle callback queries from inline buttons
   */
  async handleCallback(callbackQuery: any): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    try {
      if (data.startsWith('approve:')) {
        const contentId = data.split(':')[1];
        // Find the user by chat ID
        const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
        if (!user) {
          await this.bot.sendMessage(chatId, "Error: You need to register first. Use /register to link your account.");
          return;
        }
        
        // Use the helper function to safely get the ID
        const result = await this.approveContent(contentId, getDocumentId(user));
        await this.bot.sendMessage(chatId, result);
      } 
      else if (data.startsWith('reject:')) {
        const contentId = data.split(':')[1];
        await this.rejectContent(contentId, chatId);
      }
      else if (data.startsWith('edit:')) {
        const contentId = data.split(':')[1];
        await this.bot.sendMessage(
          chatId,
          `To edit this content, reply with:\n/edit ${contentId} your new text`
        );
      }
      else if (data.startsWith('schedule:')) {
        const contentId = data.split(':')[1];
        await this.scheduleContent(contentId, chatId);
      }
      else if (data.startsWith('activities:')) {
        // Handle pagination for activities
        const skipCount = parseInt(data.split(':')[1]);
        if (!isNaN(skipCount)) {
          await this.showRecentActivities(chatId, 5, skipCount);
        }
      }
      else if (data === 'more_activities') {
        // Legacy support for the old button
        await this.showRecentActivities(chatId, 10);
      }
      else if (data === 'more_pending') {
        await this.showPendingContent(chatId, 10);
      }
      else if (data === 'more_approved') {
        await this.showApprovedContent(chatId, 10);
      }
      else if (data === 'generate_content') {
        // Handle the generate content button
        await this.generateContent(chatId);
      }
      
      // Acknowledge the callback query
      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error: any) {
      logger.telegram.error('Error handling callback:', error);
      await this.bot.sendMessage(chatId, `Error: ${error.message}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Error occurred' });
    }
  }

  /**
   * Show recent activities for a user
   */
  private async showRecentActivities(chatId: number, limit: number = 5, skipCount: number = 0): Promise<void> {
    // Get user by chat ID
    const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
    
    if (!user) {
      throw new Error("Please register first with /register command");
    }
    
    // Get recent activities - search with both user and userId fields
    const userId = getDocumentId(user);
    
    logger.telegram.debug(`Looking for activities for user ID: ${userId}`);
    
    // Log what we're querying to help with debugging
    logger.telegram.debug(`Querying with userId: ${userId}, skip: ${skipCount}, limit: ${limit}`);
    
    // Count ALL activities for this user without any filtering
    const totalCount = await Activity.countDocuments({
      $or: [
        { user: userId },
        { userId: userId }
      ]
    });
    
    // Log the total count
    logger.telegram.info(`Total activities found: ${totalCount}`);
    
    // Get activities with pagination - NO filtering by status or type
    const activities = await Activity.find({ 
      $or: [
        { user: userId },
        { userId: userId }
      ]
    })
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skipCount)
      .limit(limit)
      .lean(); // Use lean for better performance
    
    logger.telegram.debug(`Activities fetched: ${activities.length}`);
    
    if (activities.length === 0) {
      await this.bot.sendMessage(chatId, 
        skipCount > 0 
          ? "No more activities found."
          : "No recent activities found."
      );
      return;
    }
    
    // Create message text
    let message = `📊 *Your Development Activities*\n`;
    message += `*Showing ${skipCount + 1}-${skipCount + activities.length} of ${totalCount} activities*\n\n`;
    
    for (const activity of activities) {
      try {
        // Extract type - handle different schema formats
        let activityType = (activity as any).type || 'unknown';
        if (!activityType && (activity as any).data?.type) {
          activityType = (activity as any).data.type;
        }
        
        // Map PR types to consistent format
        if (activityType === 'pull_request') activityType = 'pr';
        
        // Extract repo and title based on the schema format
        // Handle both direct properties and nested data schema
        let repoName = '', title = '';
        
        if ((activity as any).repo) {
          // Direct property schema (standard format)
          repoName = (activity as any).repo;
          title = (activity as any).title || '';
        } else if ((activity as any).data) {
          // Nested data schema (from test activities)
          const data = (activity as any).data;
          repoName = data.repository 
            ? `ssaulgoodman/${data.repository}` 
            : (data.repo || data.repoName || '');
          
          title = data.message || data.title || data.description || '';
        }

        // If still empty, try other common fields
        if (!repoName) {
          repoName = (activity as any).repository || (activity as any).repoName || 'Unknown Repository';
        }
        
        if (!title) {
          title = (activity as any).message || (activity as any).description || 'No description available';
        }
        
        // Get activity ID
        const activityId = (activity as any)._id ? (activity as any)._id.toString() : 'unknown-id';
        
        // Format the date - create a debug version to help understand what's happening
        let displayDate = 'Unknown date';
        let debugDate = '';
        let actualGitHubDate = '';
        
        if ((activity as any).createdAt) {
          const createdAtDate = new Date((activity as any).createdAt);
          
          // Use different formats to debug
          displayDate = createdAtDate.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          
          // Also add the raw ISO string for debugging
          debugDate = createdAtDate.toISOString();
        }
        
        // Try to get the actual GitHub activity date from metadata
        if ((activity as any).metadata) {
          // Different activity types store dates in different metadata fields
          const metadata = (activity as any).metadata;
          
          // For commits, use authorDate from metadata
          if (activityType === 'commit' && metadata.authorDate) {
            const authorDate = new Date(metadata.authorDate);
            actualGitHubDate = authorDate.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          } 
          // For PRs, use either mergedAt or updated_at from metadata
          else if (activityType === 'pr' && (metadata.mergedAt || metadata.updated_at)) {
            const prDate = new Date(metadata.mergedAt || metadata.updated_at);
            actualGitHubDate = prDate.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        }
        
        // If we couldn't find a date in metadata, try the data property
        if (!actualGitHubDate && (activity as any).data) {
          const data = (activity as any).data;
          if (data.date || data.created_at || data.updated_at || data.committed_at) {
            const activityDate = new Date(data.date || data.created_at || data.updated_at || data.committed_at);
            actualGitHubDate = activityDate.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
        }
        
        // Log the activity we're processing
        logger.telegram.debug(`Processing activity: ${activityType}, ${repoName}, DB date: ${debugDate}, GitHub date: ${actualGitHubDate || 'unknown'}`);
        
        const activityEmoji = this.getActivityEmoji(activityType);
        
        // Include both dates in the message if we have the actual GitHub date
        if (actualGitHubDate && actualGitHubDate !== displayDate) {
          message += `${activityEmoji} *${activityType.toUpperCase()}* (DB: ${displayDate}, GitHub: ${actualGitHubDate})\n`;
        } else {
          message += `${activityEmoji} *${activityType.toUpperCase()}* (${displayDate})\n`;
        }
        message += `Repo: ${repoName}\n`;
        message += `${title}\n`;
        message += `ID: \`${activityId}\`\n\n`;
        
      } catch (err) {
        const error = err as Error;
        logger.telegram.error(`Error processing activity:`, error);
        // Skip this activity but log the error
        logger.telegram.debug(`Error processing activity: ${JSON.stringify(activity)}`);
        continue;
      }
    }
    
    // If all activities failed to process, send an error message
    if (message === `📊 *Your Development Activities*\n*Showing ${skipCount + 1}-${skipCount + activities.length} of ${totalCount} activities*\n\n`) {
      await this.bot.sendMessage(chatId, "Found activities but encountered errors processing them. Check server logs for details.");
      return;
    }
    
    message += "Want to see content generated from these activities? Type /pending";
    
    // Add inline keyboard for better pagination
    const inlineKeyboard: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: []
    };
    
    // Add navigation buttons
    const navigationRow: TelegramBot.InlineKeyboardButton[] = [];
    
    // Only show "Previous" if we're not on the first page
    if (skipCount > 0) {
      const prevSkip = Math.max(0, skipCount - limit);
      navigationRow.push({ 
        text: "⬅️ Previous", 
        callback_data: `activities:${prevSkip}` 
      });
    }
    
    // Only show "Next" if there are more activities
    if (skipCount + activities.length < totalCount) {
      navigationRow.push({ 
        text: "Next ➡️", 
        callback_data: `activities:${skipCount + limit}` 
      });
    }
    
    // Only add the row if it has buttons
    if (navigationRow.length > 0) {
      inlineKeyboard.inline_keyboard.push(navigationRow);
    }
    
    // Add generate content button
    inlineKeyboard.inline_keyboard.push([
      { text: "🤖 Generate Content", callback_data: "generate_content" }
    ]);
    
    await this.bot.sendMessage(chatId, message, { 
      parse_mode: "Markdown",
      reply_markup: inlineKeyboard
    });
  }
  
  /**
   * Get an emoji for activity type
   */
  private getActivityEmoji(type: string): string {
    switch (type) {
      case 'commit': return '✅';
      case 'pr': return '🔄';
      case 'issue': return '🐛';
      case 'release': return '🚀';
      default: return '📝';
    }
  }
  
  /**
   * Show pending content for a user
   */
  private async showPendingContent(chatId: number, limit: number = 5): Promise<void> {
    // Get user by chat ID
    const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
    
    if (!user) {
      throw new Error("Please register first with /register command");
    }
    
    // Get pending content - use getDocumentId helper
    const pendingContent = await Content.find({ 
      user: getDocumentId(user),
      status: "pending"
    })
    .sort({ createdAt: -1 })
    .limit(limit);
    
    if (pendingContent.length === 0) {
      await this.bot.sendMessage(
        chatId, 
        "No pending content found. We'll notify you when new content is generated from your activities."
      );
      return;
    }
    
    // Send each pending content with approval buttons
    for (const content of pendingContent) {
      await this.sendContentWithActions(chatId, content);
    }
  }
  
  /**
   * Send content with action buttons
   */
  private async sendContentWithActions(chatId: number, content: IContent): Promise<void> {
    const message = `
✨ *Suggested Social Media Update*

${content.text}

📝 *Content ID:* \`${content._id}\`
⏱️ *Created:* ${new Date(content.createdAt).toLocaleString()}
    `;
    
    // Action buttons
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Approve", callback_data: `approve:${content._id}` },
          { text: "❌ Reject", callback_data: `reject:${content._id}` }
        ],
        [
          { text: "✏️ Edit", callback_data: `edit:${content._id}` },
          { text: "⏱️ Schedule", callback_data: `schedule:${content._id}` }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: inlineKeyboard
    });
  }
  
  /**
   * Schedule content for posting
   */
  private async scheduleContent(contentId: string, chatId: number): Promise<void> {
    // Find the content
    const content = await Content.findById(contentId);
    if (!content) {
      throw new Error("Content not found");
    }
    
    // Verify the user owns this content
    const user = await User.findOne({ 
      _id: content.user, 
      'telegram.chatId': chatId.toString() 
    });
    
    if (!user) {
      throw new Error("Unauthorized: You don't have permission to schedule this content");
    }
    
    // Send scheduling options
    const scheduleMessage = "Choose when to post:";
    const scheduleOptions = {
      inline_keyboard: [
        [
          { text: "In 1 hour", callback_data: `schedule-time:${contentId}:1h` },
          { text: "In 3 hours", callback_data: `schedule-time:${contentId}:3h` }
        ],
        [
          { text: "Tomorrow morning", callback_data: `schedule-time:${contentId}:9am` },
          { text: "Tomorrow evening", callback_data: `schedule-time:${contentId}:7pm` }
        ],
        [
          { text: "Best time (auto)", callback_data: `schedule-time:${contentId}:best` }
        ]
      ]
    };
    
    await this.bot.sendMessage(chatId, scheduleMessage, {
      reply_markup: scheduleOptions
    });
  }

  /**
   * Send a welcome message to new users
   */
  private async sendWelcomeMessage(chatId: number): Promise<void> {
    const message = `
Welcome to DevCast! 👋

I'll help you review and approve social media updates generated from your development activity.

*Quick Setup:*
Type */register* to link your Telegram account with DevCast. This will either:
- Create a new DevCast account for you, or
- Link to your existing account if you've used DevCast before

Need help? Type /help to see all available commands.
`;
    
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }
  
  /**
   * Send help message with available commands
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    const message = `
🚀 *DevCast Bot Commands*

*Account Setup*
/start - Get started with DevCast
/register - Link your Telegram account with DevCast

*Content Management*
/pending - View content waiting for approval
/approved - View approved and posted content
/edit [id] [text] - Edit specific content

*Content Generation*
/generate - Generate AI content from your recent GitHub activities
/generate [instructions] - Generate content with specific instructions

*Examples:*
/generate tweet about my latest PR on authentication
/generate bullish update about the new feature
/generate technical deep dive on the refactoring I just did

*Activity Tracking*
/activities - View your recent GitHub activities

*Settings*
/ai - View or change AI provider (OpenAI/Claude)

*Other Commands*
/help - Show this help message

For more assistance, visit the documentation at https://devcast.app/docs
`;
    
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }

  /**
   * Register a user with their Telegram chat ID without requiring a user ID
   */
  async registerOrLinkUser(chatId: number, username: string | null): Promise<void> {
    try {
      // First, check if this Telegram chat ID is already registered
      const existingUser = await User.findOne({ 'telegram.chatId': chatId.toString() });
      
      if (existingUser) {
        // Already registered, just confirm
        await this.bot.sendMessage(
          chatId, 
          `✅ Your Telegram account is already linked to DevCast (User ID: ${(existingUser as any)._id}).\n\nUse /help to see available commands.`,
          { parse_mode: "Markdown" }
        );
        return;
      }
      
      // If not registered yet, create a new user or update an existing one by Telegram username
      let user;
      
      if (username) {
        // Try to find existing user by Telegram username
        user = await User.findOne({ 'telegram.username': username });
      }
      
      if (!user) {
        // Create a new user with default settings
        user = await User.create({
          email: `telegram_${chatId}@example.com`, // Placeholder email
          telegram: {
            chatId: chatId.toString(),
            username: username
          },
          settings: {
            postingFrequency: 'daily',
            postingTime: '18:00',
            contentStyle: 'professional',
            autoApprove: false,
            aiProvider: 'anthropic'
          }
        });
      } else {
        // Update existing user with new telegram data
        user.telegram = {
          ...user.telegram,
          chatId: chatId.toString(),
          username: username || user.telegram?.username
        };
        await user.save();
      }
      
      const successMessage = `
✅ *Registration successful!*

Your Telegram account is now linked to DevCast (User ID: ${(user as any)._id}).

*What's Next:*
• Use */pending* to view content waiting for your approval
• Use */activities* to view your recent GitHub activities
• Use */generate* to create new content
• Use */help* to see all available commands
`;
      
      await this.bot.sendMessage(chatId, successMessage, { parse_mode: "Markdown" });

      // Check for pending content
      const pendingCount = await Content.countDocuments({ 
        user: (user as any)._id, 
        status: "pending" 
      });
      
      if (pendingCount > 0) {
        await this.bot.sendMessage(
          chatId, 
          `You have ${pendingCount} pending content items waiting for your review! Use /pending to view them.`
        );
      }
    } catch (error) {
      logger.telegram.error("Error registering user:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Error registering your account. Please try again later."
      );
    }
  }

  /**
   * Simplified registration command for backward compatibility
   * @deprecated Use registerOrLinkUser instead
   */
  private async registerUser(userId: string, chatId: number): Promise<void> {
    try {
      // Find the user and update their Telegram chat ID
      const user = await User.findByIdAndUpdate(userId, {
        telegram: {
          chatId: chatId.toString()
        }
      }, { new: true });
      
      if (!user) {
        throw new Error("User not found. Make sure you're using the correct ID.");
      }
      
      const successMessage = `
✅ *Registration successful!*

Your Telegram chat is now linked to the DevCast account.

*Account Details:*
${user.name ? `Name: ${user.name}` : ''}
${user.email ? `Email: ${user.email}` : ''}
${user.github?.username ? `GitHub: @${user.github.username}` : ''}

*What's Next:*
• Use */pending* to view content waiting for your approval
• Use */activities* to view your recent GitHub activities
• Use */approved* to view approved content
• Use */help* to see all available commands
`;
      
      await this.bot.sendMessage(chatId, successMessage, { parse_mode: "Markdown" });

      // Send a pending content notification if available
      const pendingCount = await Content.countDocuments({ 
        user: user._id, 
        status: "pending" 
      });
      
      if (pendingCount > 0) {
        await this.bot.sendMessage(
          chatId, 
          `You have ${pendingCount} pending content items waiting for your review! Use /pending to view them.`
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          "No pending content found yet. Use /activities to generate content from your GitHub activities."
        );
      }
    } catch (error) {
      logger.telegram.error("Error registering user:", error);
      throw error;
    }
  }

  /**
   * Send a content approval request
   */
  async sendApprovalRequest(content: IContent): Promise<boolean> {
    try {
      // Get the user's Telegram chat ID
      const user = await User.findById(content.user);
      if (!user || !user.telegram?.chatId) {
        return false;
      }
      
      const chatId = parseInt(user.telegram.chatId);
      if (isNaN(chatId)) {
        logger.telegram.error('Invalid chat ID:', user.telegram.chatId);
        return false;
      }
      
      await this.sendContentWithActions(chatId, content);
      return true;
    } catch (error) {
      logger.telegram.error("Error sending approval request:", error);
      return false;
    }
  }

  /**
   * Approve content submission
   * @param contentId ID of the content to approve
   * @param userId ID of the user trying to approve the content
   * @returns Status message
   */
  async approveContent(contentId: string, userId: string): Promise<string> {
    try {
      // Find the content
      const content = await Content.findById(contentId);
      if (!content) {
        return "Content not found";
      }

      // Check if user has permission to approve (admin or manager)
      const user = await User.findById(userId);
      if (!user) {
        return "User not found";
      }

      // For now, all users can approve content - will add roles later
      // if (!['admin', 'manager'].includes(user.role)) {
      //   return "You don't have permission to approve content";
      // }

      // Update content status
      content.status = "approved";
      content.metadata = {
        ...content.metadata,
        approvedBy: userId,
        approvedAt: new Date()
      };
      await content.save();

      // Save the tweet to MongoDB for later use
      try {
        // Only proceed if the user has Twitter credentials
        if (user.twitter && user.twitter.accessToken && user.twitter.accessTokenSecret) {
          const twitterService = new TwitterService(
            user.twitter.accessToken,
            user.twitter.accessTokenSecret
          );
          
          await twitterService.saveApprovedTweet(contentId);
          logger.telegram.info(`Tweet saved to MongoDB for later use: ${contentId}`);
        } else {
          logger.telegram.info(`User ${userId} doesn't have Twitter credentials, skipping saveApprovedTweet`);
        }
      } catch (error: unknown) {
        // Log the error but don't fail the approval process
        logger.telegram.error(`Error saving approved tweet: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Update related activities status to 'published'
      if (content.relatedActivities && content.relatedActivities.length > 0) {
        try {
          await Activity.updateMany(
            { _id: { $in: content.relatedActivities } },
            { 
              $set: { 
                status: 'published',
                publishedAt: new Date()
              } 
            }
          );
          logger.telegram.info(`Updated ${content.relatedActivities.length} activities to 'published' status`);
        } catch (activityError: unknown) {
          logger.telegram.error(`Error updating activities status: ${activityError instanceof Error ? activityError.message : String(activityError)}`);
        }
      }

      // Notify user
      if (user.telegram && user.telegram.chatId) {
        await this.bot.sendMessage(
          user.telegram.chatId as unknown as string,
          `Content approved: "${content.text.substring(0, 50)}${content.text.length > 50 ? '...' : ''}"`
        );
      }

      return "Content approved successfully";
    } catch (error: unknown) {
      logger.telegram.error("Error approving content:", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Reject content
   */
  private async rejectContent(contentId: string, chatId: number): Promise<void> {
    // Find the content
    const content = await Content.findById(contentId);
    if (!content) {
      throw new Error("Content not found");
    }
    
    // Verify the user owns this content
    const user = await User.findOne({ 
      _id: content.user, 
      'telegram.chatId': chatId.toString() 
    });
    
    if (!user) {
      throw new Error("Unauthorized: You don't have permission to reject this content");
    }
    
    // Update content status
    await Content.findByIdAndUpdate(contentId, { status: "rejected" });
    
    // Update related activities status to 'processed' if this was the only content for them
    if (content.relatedActivities && content.relatedActivities.length > 0) {
      try {
        // For each related activity
        for (const activityId of content.relatedActivities) {
          // Check if there's any approved content for this activity
          const hasApprovedContent = await Content.exists({
            relatedActivities: activityId,
            status: { $in: ['approved', 'posted'] },
            _id: { $ne: content._id } // Exclude the current content
          });
          
          // If no approved content exists, mark as processed
          if (!hasApprovedContent) {
            await Activity.findByIdAndUpdate(
              activityId,
              { 
                $set: { 
                  status: 'processed',
                  processedAt: new Date()
                } 
              }
            );
            logger.telegram.info(`Updated activity ${activityId} to 'processed' status`);
          }
        }
      } catch (activityError) {
        logger.telegram.error(`Error updating activities status: ${activityError instanceof Error ? activityError.message : String(activityError)}`);
      }
    }
    
    // Notify user
    await this.bot.sendMessage(
      chatId,
      `❌ Content rejected. We'll generate new content for your next update.`
    );
  }

  /**
   * Edit and approve content
   */
  private async editContent(contentId: string, newText: string, chatId: number): Promise<void> {
    // Find the content
    const content = await Content.findById(contentId);
    if (!content) {
      throw new Error("Content not found");
    }
    
    // Verify the user owns this content
    const user = await User.findOne({ 
      _id: content.user, 
      'telegram.chatId': chatId.toString() 
    });
    
    if (!user) {
      throw new Error("Unauthorized: You don't have permission to edit this content");
    }
    
    // Update content text only, keep status as pending
    await Content.findByIdAndUpdate(contentId, { 
      text: newText,
      status: "pending" // Keep as pending until explicitly approved
    });
    
    // Notify user
    await this.bot.sendMessage(
      chatId,
      `✏️ Content edited successfully! Use the Approve button to publish it.`
    );
    
    // Show the updated content with action buttons
    const updatedContent = await Content.findById(contentId);
    if (updatedContent) {
      await this.sendContentWithActions(chatId, updatedContent);
    }
  }

  /**
   * Send a notification about posted content
   */
  async sendPostNotification(content: IContent): Promise<boolean> {
    try {
      // Get the user's Telegram chat ID
      const user = await User.findById(content.user);
      if (!user || !user.telegram?.chatId) {
        return false;
      }
      
      const chatId = parseInt(user.telegram.chatId);
      if (isNaN(chatId)) {
        logger.telegram.error('Invalid chat ID:', user.telegram.chatId);
        return false;
      }
      
      // Format the message
      const message = `
🚀 *Update Posted Successfully!*

${content.text}

🔗 [View on Twitter/X](${content.postUrl})
`;
      
      // Send the message
      await this.bot.sendMessage(chatId, message, { 
        parse_mode: "Markdown",
        disable_web_page_preview: false
      });
      return true;
    } catch (error) {
      logger.telegram.error("Error sending post notification:", error);
      return false;
    }
  }

  /**
   * Show AI provider options to the user
   */
  private async showAIProviderOptions(chatId: number): Promise<void> {
    try {
      // Find user by Telegram chat ID
      const user = await User.findOne({ "telegram.chatId": chatId.toString() });
      if (!user) {
        throw new Error("User not found. Please register with /register YOUR_ID");
      }
      
      // Get current AI provider setting
      const currentProvider = user.settings?.aiProvider || 'anthropic';
      
      const message = `
*AI Provider Settings*

Your current AI provider for content generation is: *${currentProvider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT-4)'}*

To change your AI provider, use one of these commands:

/ai anthropic - Switch to Anthropic (Claude)
/ai openai - Switch to OpenAI (GPT-4)

Each provider has slightly different styles and capabilities. You may want to try both to see which produces content that better matches your preferences.
`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      logger.telegram.error("Error showing AI provider options:", error);
      await this.bot.sendMessage(
        chatId,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  /**
   * Set the AI provider for a user
   */
  private async setAIProvider(provider: string, chatId: number): Promise<void> {
    try {
      // Validate provider
      if (provider !== 'anthropic' && provider !== 'openai') {
        await this.bot.sendMessage(
          chatId,
          "Invalid provider. Use 'anthropic' or 'openai'."
        );
        return;
      }
      
      // Find user by Telegram chat ID
      const user = await User.findOne({ "telegram.chatId": chatId.toString() });
      if (!user) {
        throw new Error("User not found. Please register with /register YOUR_ID");
      }
      
      // Update user's AI provider preference
      user.settings = {
        ...user.settings,
        aiProvider: provider
      };
      
      await user.save();
      
      // Send confirmation
      const message = `
✅ AI provider updated successfully!

You are now using *${provider === 'anthropic' ? 'Anthropic (Claude)' : 'OpenAI (GPT-4)'}* for content generation.

Your next generated content will use this provider.
`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      logger.telegram.error("Error setting AI provider:", error);
      await this.bot.sendMessage(
        chatId,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Show approved content
   */
  private async showApprovedContent(chatId: number, limit: number = 5): Promise<void> {
    try {
      // Find the user by Telegram chat ID
      const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
      if (!user) {
        await this.bot.sendMessage(chatId, "You need to register first. Type /register to link your account.");
        return;
      }
      
      // Get approved, posted, and scheduled content - use getDocumentId helper
      const approvedContent = await Content.find({ 
        user: getDocumentId(user),
        status: { $in: ["approved", "posted"] }
      })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(limit);
      
      if (approvedContent.length === 0) {
        await this.bot.sendMessage(chatId, "You don't have any approved content yet.");
        return;
      }
      
      await this.bot.sendMessage(chatId, `*Your Approved Content (${approvedContent.length})*`, {
        parse_mode: "Markdown"
      });
      
      // Send each content item
      for (const content of approvedContent) {
        let status = "🕒 Scheduled";
        
        if (content.status === "posted") {
          status = "✅ Posted";
        } else if (content.scheduledFor && content.scheduledFor < new Date()) {
          status = "⏳ Posting soon";
        }
        
        let message = `
*${status}*

${content.text}

📝 *ID:* \`${content._id}\`
`;

        if (content.scheduledFor) {
          message += `⏰ *Scheduled for:* ${new Date(content.scheduledFor).toLocaleString()}\n`;
        }
        
        if (content.postUrl) {
          message += `🔗 [View on Twitter/X](${content.postUrl})\n`;
        }
        
        await this.bot.sendMessage(chatId, message, {
          parse_mode: "Markdown",
          disable_web_page_preview: content.status !== "posted" // Enable preview only for posted content
        });
      }
      
      // Send "Load more" button if there might be more content
      if (approvedContent.length === limit) {
        await this.bot.sendMessage(chatId, "Want to see more?", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "Load more approved content", callback_data: "more_approved" }]
            ]
          }
        });
      }
    } catch (error) {
      logger.telegram.error("Error showing approved content:", error);
      throw error;
    }
  }

  /**
   * Generate content from the user's recent activities
   */
  private async generateContent(chatId: number): Promise<void> {
    try {
      // Find the user by Telegram chat ID
      const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
      if (!user) {
        await this.bot.sendMessage(chatId, "You need to register first. Type /register YOUR_USER_ID");
        return;
      }
      
      // Use type assertion to tell TypeScript this is a valid User document with _id
      const userId = user._id as mongoose.Types.ObjectId;
      
      // Check if the user has any activities - search with both user and userId fields
      const activities = await Activity.find({ 
        $or: [
          { user: userId },
          { userId: userId.toString() }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(10);
      
      if (activities.length === 0) {
        await this.bot.sendMessage(
          chatId, 
          "No activities found to generate content from. Please create some GitHub activities first."
        );
        return;
      }

      // Transform activities to ensure they have repo and title
      const validActivities = activities.map(activity => {
        // If the activity already has repo and title, use them
        if (activity.repo && activity.title) {
          return activity;
        }
        
        // Otherwise, extract from data property
        if ((activity as any).data) {
          const data = (activity as any).data;
          const transformed = {...activity.toObject()};
          
          if (!transformed.repo && data.repository) {
            transformed.repo = `ssaulgoodman/${data.repository}`;
          }
          
          if (!transformed.title && (data.message || data.title)) {
            transformed.title = data.message || data.title;
          }
          
          return transformed;
        }
        
        return activity;
      }).filter(activity => activity.repo && activity.title);
      
      if (validActivities.length === 0) {
        await this.bot.sendMessage(
          chatId, 
          "Found activities but they have incomplete data. Please check your GitHub activity data structure."
        );
        return;
      }
      
      // Send a message that we're generating content
      await this.bot.sendMessage(
        chatId, 
        "🤖 Generating AI content from your recent activities... This might take a few seconds."
      );
      
      try {
        // Create content generator with user's preferred settings
        const contentGenerator = new ContentGenerator(
          userId.toString(),
          user.settings?.contentStyle || 'professional',
          {
            provider: user.settings?.aiProvider as any || 'anthropic',
            maxRetries: 2
          }
        );
        
        // Group activities by repo
        const activitiesByRepo: Record<string, any[]> = {};
        for (const activity of validActivities) {
          if (!activitiesByRepo[activity.repo]) {
            activitiesByRepo[activity.repo] = [];
          }
          activitiesByRepo[activity.repo].push(activity);
        }
        
        // Generate content for each repo
        const contentItems = [];
        for (const [repo, repoActivities] of Object.entries(activitiesByRepo)) {
          // Use the ContentGenerator to create AI-generated content
          const content = await contentGenerator.generateContentForRepository(
            repo,
            repoActivities
          );
          
          if (content) {
            contentItems.push(content);
          }
        }
        
        if (contentItems.length === 0) {
          await this.bot.sendMessage(
            chatId, 
            "Failed to generate content. Please try again later or check your AI service configuration."
          );
          return;
        }
        
        // Send a success message
        await this.bot.sendMessage(
          chatId, 
          `✅ Successfully generated ${contentItems.length} content items using ${user.settings?.aiProvider || 'AI'} technology! Use /pending to review them.`
        );
        
        // Show the first item immediately
        await this.showPendingContent(chatId, 1);
      } catch (generationError: unknown) {
        logger.telegram.error("Error generating content:", generationError);
        
        // Provide more specific error message based on the error
        let errorMessage = "Error generating content with AI. Please try again later.";
        
        // Check for authentication errors
        if (generationError instanceof Error && generationError.message.includes("API key")) {
          if (generationError.message.includes("Anthropic") || generationError.message.includes("ANTHROPIC")) {
            errorMessage = "Error with Claude AI authentication. Please check your ANTHROPIC_API_KEY environment variable.";
          } else if (generationError.message.includes("OpenAI") || generationError.message.includes("OPENAI")) {
            errorMessage = "Error with OpenAI authentication. Please check your OPENAI_API_KEY environment variable or switch to Claude using /ai anthropic.";
          } else {
            errorMessage = "Error with AI service authentication. Please check your API keys.";
          }
        } else if (generationError instanceof Error) {
          // Include part of the error message for debugging
          const errorMsg = generationError.message.substring(0, 100);
          errorMessage = `AI generation error: ${errorMsg}${errorMsg.length > 100 ? '...' : ''}. Using fallback content.`;
        }
        
        await this.bot.sendMessage(chatId, errorMessage);
      }
    } catch (error) {
      logger.telegram.error("Error generating content:", error);
      await this.bot.sendMessage(
        chatId, 
        "Error generating content. Please try again later."
      );
    }
  }

  /**
   * Helper method to send a message to a user
   */
  private async sendMessage(chatId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, options);
    } catch (error) {
      logger.telegram.error(`Error sending message to ${chatId}:`, error);
    }
  }

  /**
   * Generate content with specific instructions and respond to the user
   */
  async generateContentWithInstructions(chatId: number, instructions: string): Promise<void> {
    logger.telegram.info(`Generating content with instructions for user ${chatId}: "${instructions}"`);
    console.log(`Generating content with instructions for user ${chatId}: "${instructions}"`);
    
    // Create a request ID for tracking
    const requestId = Date.now().toString();
    
    try {
      // Create a dedicated log file for this request
      try {
        const logMessage = `=== GENERATE COMMAND REQUEST ${requestId} ===\n` +
                          `TIME: ${new Date().toISOString()}\n` +
                          `CHAT ID: ${chatId}\n` +
                          `INSTRUCTIONS: ${instructions}\n\n`;
        fs.writeFileSync(`generate-request-${requestId}.log`, logMessage);
      } catch (error) {
        logger.telegram.error(`Failed to create request log file for generate command:`, error);
      }
      
      // Send an initial message to the user
      await this.sendMessage(chatId, "🔍 Analyzing your GitHub activity and generating content...");
      
      // Get the user document from the database
      const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
      if (!user) {
        logger.telegram.info(`User not found for chatId: ${chatId}`);
        await this.sendMessage(chatId, "❌ User not found. Please use /start to set up your account.");
        return;
      }
      
      // Use getDocumentId helper to safely get the user ID
      const userId = getDocumentId(user);
      logger.telegram.info(`User settings: userId=${userId}, aiProvider=${user.settings?.aiProvider}, contentStyle=${user.settings?.contentStyle}`);
      
      // Create a content generator with user's preferred settings
      const provider = user.settings?.aiProvider || "anthropic";
      const style = user.settings?.contentStyle || "professional";
      
      logger.telegram.info(`Creating ContentGenerator with userId=${userId}, style=${style}, provider=${provider}`);
      
      try {
        fs.appendFileSync(`generate-request-${requestId}.log`, 
          `USER ID: ${userId}\n` +
          `AI PROVIDER: ${provider}\n` +
          `CONTENT STYLE: ${style}\n\n`
        );
      } catch (error) {
        logger.telegram.error(`Failed to append to request log file:`, error);
      }
      
      const generator = new ContentGenerator(
        userId,
        style,
        { provider }
      );
      
      logger.telegram.info(`Created ContentGenerator with provider: ${provider}`);
      
      // Generate content with the user's instructions
      logger.telegram.info(`Calling generator.generateContentWithInstructions with: "${instructions}"`);
      
      // Progress updates to user and tracking in case the process hangs
      let timeoutCounter = 0;
      const timeoutId = setInterval(() => {
        timeoutCounter += 5;
        try {
          fs.appendFileSync(`generate-request-${requestId}.log`, 
            `PROGRESS UPDATE: Request still running after ${timeoutCounter} seconds\n`
          );
        } catch (error) { /* ignore */ }
        
        if (timeoutCounter === 15) {
          logger.telegram.warn(`⚠️ Content generation taking longer than 15s for: "${instructions}"`);
          this.sendMessage(chatId, "⏳ Content generation in progress... (15s)").catch(console.error);
        }
        
        if (timeoutCounter === 30) {
          logger.telegram.warn(`⚠️ Content generation taking longer than 30s for: "${instructions}"`);
          this.sendMessage(chatId, "⏳ Still working... The AI is thinking deeply about your request. (30s)").catch(console.error);
        }
        
        if (timeoutCounter >= 60) {
          logger.telegram.warn(`⚠️ Content generation potentially stalled after 60s for: "${instructions}"`);
          clearInterval(timeoutId);
          this.sendMessage(chatId, "⚠️ The request is taking unusually long. If you don't receive a response soon, please try again.").catch(console.error);
        }
      }, 5000);
      
      // Generate the content
      const content = await generator.generateContentWithInstructions(instructions);
      clearInterval(timeoutId);
      
      // Log the completion
      try {
        fs.appendFileSync(`generate-request-${requestId}.log`, 
          `GENERATION COMPLETED: ${new Date().toISOString()}\n` +
          `SUCCESS: ${Boolean(content)}\n\n`
        );
        
        if (content) {
          fs.appendFileSync(`generate-request-${requestId}.log`, 
            `GENERATED TEXT:\n${content.text}\n\n` +
            `METADATA: ${JSON.stringify(content.metadata || {}, null, 2)}\n`
          );
        }
      } catch (error) {
        logger.telegram.error(`Failed to append completion to request log file:`, error);
      }
      
      if (content) {
        logger.telegram.info(`Content generation successful. Generated text: "${content.text}"`);
        
        // Check if there's debug information in the metadata
        if (content.metadata?.debug) {
          logger.telegram.info(`Debug information: ${content.metadata.debug}`);
        }
        
        // Build the response message - conditionally include debug info
        let responseMessage = `✅ Generated content based on your instructions:\n\n${content.text}`;
        
        // Add debug info, but keep it concise
        const debugMessage = content.metadata?.debug ? 
          `\n\n===== DEBUG INFO =====\n${
            content.metadata.debug.length > 300 
              ? content.metadata.debug.substring(0, 300) + '...' 
              : content.metadata.debug
          }` : '';
        
        if (debugMessage) {
          responseMessage += debugMessage;
        }
        
        // Send the generated content to the user
        await this.sendMessage(chatId, responseMessage);
        
        // Send the approval options
        const inlineKeyboard = {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve:${content._id}` },
              { text: "❌ Reject", callback_data: `reject:${content._id}` },
              { text: "✏️ Edit", callback_data: `edit:${content._id}` }
            ]
          ]
        };
        
        await this.sendMessage(
          chatId,
          "What would you like to do with this content?",
          { reply_markup: inlineKeyboard }
        );
      } else {
        logger.telegram.info(`Content generation failed - no content returned`);
        
        // Try to log the error
        try {
          fs.appendFileSync(`generate-request-${requestId}.log`, 
            `ERROR: No content was returned from generator.generateContentWithInstructions\n`
          );
        } catch (error) { /* ignore */ }
        
        // No content was generated
        await this.sendMessage(
          chatId,
          "❌ Unable to generate content. No activities were found or there was an AI service error. Please check your API keys and make sure you have recent activity data."
        );
      }
    } catch (error: any) {
      logger.telegram.error(`❌ Error generating content: ${error.message}`);
      console.error("Error generating content with instructions:", error);
      
      // Log the error details
      try {
        fs.appendFileSync(`generate-request-${requestId}.log`, 
          `ERROR OCCURRED: ${new Date().toISOString()}\n` +
          `ERROR MESSAGE: ${error.message}\n` +
          `ERROR STACK: ${error.stack}\n`
        );
      } catch (logError) {
        logger.telegram.error(`Failed to write error details to log:`, logError);
      }
      
      // Handle different types of errors with clear user messages
      let errorMessage = "❌ Error generating content.";
      
      // Authentication errors
      if (error.message?.includes("API key not found") || 
          error.message?.includes("401") || 
          error.message?.includes("authentication")) {
        if (error.message?.includes("anthropic") || error.message?.includes("claude")) {
          errorMessage = "❌ Error: Authentication failed with Claude AI. Please check your Anthropic API key.";
        } else if (error.message?.includes("openai") || error.message?.includes("gpt")) {
          errorMessage = "❌ Error: Authentication failed with OpenAI. Please check your OpenAI API key.";
        } else {
          errorMessage = "❌ Error: Authentication failed with the AI provider. Please check your API keys.";
        }
      }
      // Rate limit errors
      else if (error.message?.includes("rate limit") || 
               error.message?.includes("429") || 
               error.message?.includes("too many requests")) {
        errorMessage = "❌ Error: The AI service is currently overloaded. Please try again in a few minutes.";
      }
      // Timeout errors
      else if (error.message?.includes("timeout") || 
               error.message?.includes("timed out")) {
        errorMessage = "❌ Error: The request timed out. Please try again or use a different AI provider.";
      }
      // Fall back to the generic error message with details
      else {
        errorMessage = `❌ Error: ${error.message || "Unknown error occurred"}`;
      }
      
      await this.sendMessage(chatId, errorMessage);
      
      // Add a suggestion to try the alternative provider
      const currentProvider = error.message?.includes("anthropic") ? "Claude" : 
                             (error.message?.includes("openai") ? "OpenAI" : "the current AI provider");
      const alternateProvider = currentProvider === "Claude" ? "OpenAI" : "Claude";
      
      await this.sendMessage(
        chatId,
        `💡 Tip: You're currently using ${currentProvider}. You can try ${alternateProvider} instead by typing:\n/ai ${alternateProvider.toLowerCase()}`
      );
    }
  }
} 