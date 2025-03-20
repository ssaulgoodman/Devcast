import TelegramBot from "node-telegram-bot-api";
import { Content, IContent } from "@/models/Content";
import { User } from "@/models/User";

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

Need help? Visit our documentation at https://devcast-docs.example.com
`;
    
    await this.bot.sendMessage(chatId, message);
  }

  /**
   * Register a user with their Telegram chat ID
   */
  private async registerUser(userId: string, chatId: number): Promise<void> {
    // Find the user and update their Telegram chat ID
    const user = await User.findByIdAndUpdate(userId, {
      telegramChatId: chatId.toString(),
    });
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const successMessage = `
✅ Successfully registered!

You'll now receive notifications about your DevCast updates here.
Use these commands to manage your updates:
- /approve [id] - Approve an update for posting
- /reject [id] - Reject an update
- /edit [id] [new text] - Edit and approve an update

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
      
      const chatId = user.telegram.chatId;
      
      // Format the message
      const message = `
🔔 *New Update Ready for Review*

${content.text}

📊 About this update:
- ID: \`${content._id}\`
- Based on ${content.relatedActivities.length} recent activities

*Actions:*
/approve ${content._id} - Post now
/reject ${content._id} - Discard this update
/edit ${content._id} [your new text] - Edit then post
`;
      
      // Send the message
      await this.bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
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
      telegramChatId: chatId.toString() 
    });
    
    if (!user) {
      throw new Error("Unauthorized: You don't have permission to approve this content");
    }
    
    // Update content status
    await Content.findByIdAndUpdate(contentId, { status: "approved" });
    
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
      telegramChatId: chatId.toString() 
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
      telegramChatId: chatId.toString() 
    });
    
    if (!user) {
      throw new Error("Unauthorized: You don't have permission to edit this content");
    }
    
    // Update content text and status
    await Content.findByIdAndUpdate(contentId, { 
      text: newText,
      status: "edited"
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
      
      const chatId = user.telegram.chatId;
      
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
} 