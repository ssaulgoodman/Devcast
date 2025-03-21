import TelegramBot from "node-telegram-bot-api";
import { Content, IContent } from "@/models/Content";
import { User } from "@/models/User";
import { Activity } from "@/models/Activity";

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
   * Start the bot polling
   */
  startPolling(): void {
    this.bot.startPolling();
    
    // Handle approve command
    this.bot.onText(/\/approve\s+(\w+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const contentId = match?.[1];
      
      if (!contentId) {
        await this.bot.sendMessage(chatId, "Error: Content ID not provided");
        return;
      }
      
      try {
        await this.approveContent(contentId, chatId);
      } catch (error: any) {
        await this.bot.sendMessage(chatId, `Error: ${error.message}`);
      }
    });
    
    // Handle reject command
    this.bot.onText(/\/reject\s+(\w+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const contentId = match?.[1];
      
      if (!contentId) {
        await this.bot.sendMessage(chatId, "Error: Content ID not provided");
        return;
      }
      
      try {
        await this.rejectContent(contentId, chatId);
      } catch (error: any) {
        await this.bot.sendMessage(chatId, `Error: ${error.message}`);
      }
    });
    
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
    this.bot.onText(/\/register\s+(\w+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const userId = match?.[1];
      
      if (!userId) {
        await this.bot.sendMessage(chatId, "Error: User ID not provided");
        return;
      }
      
      try {
        await this.registerUser(userId, chatId);
      } catch (error: any) {
        await this.bot.sendMessage(chatId, `Error: ${error.message}`);
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
          if (args.length === 0) {
            await this.bot.sendMessage(chatId, "Error: User ID not provided. Usage: /register YOUR_ID");
          } else {
            await this.registerUser(args[0], chatId);
          }
          break;
          
        case '/approve':
          if (args.length === 0) {
            await this.bot.sendMessage(chatId, "Error: Content ID not provided. Usage: /approve CONTENT_ID");
          } else {
            await this.approveContent(args[0], chatId);
          }
          break;
          
        case '/reject':
          if (args.length === 0) {
            await this.bot.sendMessage(chatId, "Error: Content ID not provided. Usage: /reject CONTENT_ID");
          } else {
            await this.rejectContent(args[0], chatId);
          }
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
    } catch (error) {
      console.error(`Error processing command ${command}:`, error);
      await this.bot.sendMessage(
        chatId,
        `Error processing command: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
        await this.approveContent(contentId, chatId);
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
      else if (data === 'more_activities') {
        await this.showRecentActivities(chatId, 10);
      }
      else if (data === 'more_pending') {
        await this.showPendingContent(chatId, 10);
      }
      
      // Acknowledge the callback query
      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error: any) {
      console.error('Error handling callback:', error);
      await this.bot.sendMessage(chatId, `Error: ${error.message}`);
      await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Error occurred' });
    }
  }

  /**
   * Show recent activities for a user
   */
  private async showRecentActivities(chatId: number, limit: number = 5): Promise<void> {
    // Get user by chat ID
    const user = await User.findOne({ 'telegram.chatId': chatId.toString() });
    
    if (!user) {
      throw new Error("Please register first with /register command");
    }
    
    // Get recent activities
    const activities = await Activity.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    if (activities.length === 0) {
      await this.bot.sendMessage(chatId, "No recent activities found.");
      return;
    }
    
    // Create message text
    let message = `📊 *Your ${activities.length} Most Recent Development Activities*\n\n`;
    
    for (const activity of activities) {
      const activityEmoji = this.getActivityEmoji(activity.type);
      const date = new Date(activity.createdAt).toLocaleDateString();
      
      message += `${activityEmoji} *${activity.type.toUpperCase()}* (${date})\n`;
      message += `Repo: ${activity.repo}\n`;
      message += `${activity.title}\n\n`;
    }
    
    message += "Want to see content generated from these activities? Type /pending";
    
    // Add inline keyboard for more activities
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: "View More Activities", callback_data: "more_activities" }]
      ]
    };
    
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
    
    // Get pending content
    const pendingContent = await Content.find({ 
      user: user._id,
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

To link this chat to your DevCast account, please:
1. Go to your DevCast web dashboard
2. Navigate to the "Settings" page
3. Find your unique registration code
4. Come back here and type: /register YOUR_CODE

Need help? Type /help to see all available commands.
`;
    
    await this.bot.sendMessage(chatId, message);
  }
  
  /**
   * Send help message with available commands
   */
  private async sendHelpMessage(chatId: number): Promise<void> {
    const message = `
🚀 *DevCast Bot Commands*

*Account Setup*
/start - Get started with DevCast
/register [id] - Link your DevCast account

*Content Management*
/pending - View pending content for approval
/approve [id] - Approve content for posting
/reject [id] - Reject content
/edit [id] [text] - Edit and approve content

*Activity Tracking*
/activities - View your recent GitHub activities

*Settings*
/ai - View or change AI provider (OpenAI/Claude)

*Other Commands*
/help - Show this help message

For more assistance, visit our documentation at https://devcast-docs.example.com
`;
    
    await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
  }

  /**
   * Register a user with their Telegram chat ID
   */
  private async registerUser(userId: string, chatId: number): Promise<void> {
    // Find the user and update their Telegram chat ID
    const user = await User.findByIdAndUpdate(userId, {
      telegram: {
        chatId: chatId.toString()
      }
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const successMessage = `
✅ Successfully registered!

You'll now receive notifications about your DevCast updates here.
Use these commands to manage your updates:
- /pending - View content waiting for your approval
- /activities - View your recent GitHub activities
- /help - See all available commands

Your first update will arrive soon!
`;
    
    await this.bot.sendMessage(chatId, successMessage);
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
        console.error('Invalid chat ID:', user.telegram.chatId);
        return false;
      }
      
      await this.sendContentWithActions(chatId, content);
      return true;
    } catch (error) {
      console.error("Error sending approval request:", error);
      return false;
    }
  }

  /**
   * Approve content for posting
   */
  private async approveContent(contentId: string, chatId: number): Promise<void> {
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
      throw new Error("Unauthorized: You don't have permission to approve this content");
    }
    
    // Update content status and schedule for immediate posting
    const now = new Date();
    await Content.findByIdAndUpdate(contentId, { 
      status: "approved",
      scheduledFor: now 
    });
    
    // Notify user
    await this.bot.sendMessage(
      chatId,
      `✅ Content approved for posting! It will be published to Twitter/X shortly.`
    );
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
    
    // Update content text and status
    const now = new Date();
    await Content.findByIdAndUpdate(contentId, { 
      text: newText,
      status: "approved",
      scheduledFor: now
    });
    
    // Notify user
    await this.bot.sendMessage(
      chatId,
      `✏️ Content edited and approved! It will be published to Twitter/X shortly.`
    );
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
        console.error('Invalid chat ID:', user.telegram.chatId);
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
      console.error("Error sending post notification:", error);
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
      const currentProvider = user.settings?.aiProvider || 'openai';
      
      const message = `
*AI Provider Settings*

Your current AI provider for content generation is: *${currentProvider === 'openai' ? 'OpenAI (GPT-4)' : 'Anthropic (Claude)'}*

To change your AI provider, use one of these commands:

/ai openai - Switch to OpenAI (GPT-4)
/ai anthropic - Switch to Anthropic (Claude)

Each provider has slightly different styles and capabilities. You may want to try both to see which produces content that better matches your preferences.
`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error showing AI provider options:", error);
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
      if (provider !== 'openai' && provider !== 'anthropic') {
        await this.bot.sendMessage(
          chatId,
          "Invalid provider. Use 'openai' or 'anthropic'."
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

You are now using *${provider === 'openai' ? 'OpenAI (GPT-4)' : 'Anthropic (Claude)'}* for content generation.

Your next generated content will use this provider.
`;
      
      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error setting AI provider:", error);
      await this.bot.sendMessage(
        chatId,
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
} 