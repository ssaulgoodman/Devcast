# DevCast Telegram Bot Guide

DevCast now features Telegram as the primary interface for managing your development-to-social-media workflow. This guide will help you get started with the Telegram bot and learn all the commands available.

## Why Telegram?

We've chosen Telegram as the primary UI for DevCast because:

- Developers already spend significant time in chat apps
- It reduces context switching between tools
- It allows for real-time notifications and quick approvals
- It works seamlessly on both desktop and mobile devices
- It provides a simple, command-based interface that's easy to use

## Setup and Configuration

### 1. Prerequisites

Before setting up the Telegram bot, make sure you have:

- A Telegram account
- The DevCast application running
- MongoDB properly configured
- Your GitHub integration working

### 2. Bot Creation

To create your DevCast Telegram bot:

1. Open Telegram and search for `@BotFather`
2. Start a chat with BotFather and send `/newbot`
3. Follow the prompts to create a new bot:
   - Provide a display name (e.g., "DevCast")
   - Provide a username (e.g., "DevCastBot")
4. Save the API token provided by BotFather

### 3. Environment Configuration

Add the Telegram bot token to your environment variables:

1. Open your `.env` and `.env.local` files
2. Add or update the following variable:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   ```
3. Make sure the token is exactly the same in both files
4. Restart your application

### 4. Webhook Setup

Set up the webhook to receive messages from Telegram:

1. Make sure your server is accessible via HTTPS (use ngrok for development)
2. Run the webhook setup script:
   ```bash
   node scripts/setup-telegram-webhook.js https://your-domain.com/api/telegram/webhook
   ```

### 5. Verify Setup

Verify that your bot is properly configured:

1. Run the restart script to check token validity:
   ```bash
   node scripts/restart-telegram-bot.js
   ```
2. Check if the bot responds to a `/start` command in Telegram

## Getting Started

### 1. Find the Bot

First, you need to locate the DevCast bot on Telegram:

1. Open Telegram and search for your bot's username (e.g., `@DevCastBot`)
2. Start a chat with the bot
3. Send the command `/start` to initiate the setup process

### 2. Link Your DevCast Account

To link your Telegram chat with your DevCast account:

1. Go to your DevCast web dashboard at https://devcast.app/settings
2. Find your unique registration code in the "Telegram Integration" section
3. In your Telegram chat with the bot, send: `/register YOUR_CODE`
4. The bot will confirm successful registration

Alternatively, for testing:

1. Get your Telegram chat ID using `@userinfobot` on Telegram
2. Run the setup test user script:
   ```bash
   node scripts/setup-test-user.js
   ```
3. Use the provided registration code with the `/register` command

## Available Commands

Here are all available commands in the DevCast Telegram bot:

### Account Setup

- `/start` - Initiate the bot and get a welcome message
- `/register <code>` - Link your Telegram chat with your DevCast account using your unique code

### Content Management

- `/pending` - View content waiting for your approval
- `/approve <id>` - Approve specific content for posting
- `/reject <id>` - Reject specific content
- `/edit <id> <text>` - Edit and approve specific content with new text

### Activity Tracking

- `/activities` - View your recent GitHub activities

### Settings

- `/ai` - View your current AI provider settings
- `/ai openai` - Switch to OpenAI (GPT-4) for content generation
- `/ai anthropic` - Switch to Anthropic (Claude) for content generation

### Other Commands

- `/help` - Get a list of all available commands

## Managing Content Generation

### Choosing Your AI Provider

DevCast supports two AI providers for generating social media content:

1. **OpenAI (GPT-4)** - The default provider, known for concise and direct content
2. **Anthropic (Claude)** - An alternative provider, often more conversational in style

To check your current AI provider:
```
/ai
```

To switch to a specific provider:
```
/ai openai
```
or
```
/ai anthropic
```

Each provider may generate slightly different content. Try both to see which better matches your preferred style!

## Interactive Buttons

When viewing content for approval, you'll see interactive buttons that allow you to:

- ✅ **Approve** - Post the content to Twitter/X immediately
- ❌ **Reject** - Decline the suggested content
- ✏️ **Edit** - Modify the content before posting
- ⏱️ **Schedule** - Choose when to post the content

## Testing the Bot

### 1. Setting Up Test Data

To test the bot with sample content:

1. Create a test activity:
   ```bash
   node scripts/create-test-activity.js
   ```

2. Generate content from the activity:
   ```bash
   node scripts/test-content-generation-fixed.js YOUR_USER_ID
   ```

3. Send the `/pending` command to the bot to view and approve the generated content

### 2. Testing Workflow

To test the complete workflow:

1. Connect your GitHub repository to DevCast
2. Make a commit or other GitHub activity
3. Wait for the webhook to process the activity
4. Check for a notification in your Telegram chat
5. Use commands like `/activities` and `/pending` to interact with the bot
6. Approve or reject content using the interactive buttons

### 3. Common Testing Issues

- If the bot doesn't respond, verify your webhook setup
- If commands don't work, check the server logs for errors
- If content doesn't generate, verify your activity model matches the schema

## Workflow Example

Here's a typical workflow with the DevCast Telegram bot:

1. You commit code, create a PR, or perform some GitHub activity
2. DevCast receives the activity through webhooks
3. The system groups your activities and generates social media content
4. You receive a Telegram message with the suggested post
5. You can approve it as-is, edit it, schedule it, or reject it
6. After approval, the content is posted to your Twitter/X account
7. You receive a confirmation message with a link to the post

## Troubleshooting

### Bot Not Responding
- Verify that your Telegram token is correctly set in both `.env` and `.env.local`
- Check that your webhook URL is accessible and properly configured
- Ensure your server is running and listening for webhook events
- Check server logs for any errors in processing webhook requests

### Commands Not Working
- Restart your application to reload environment variables
- Verify that your Telegram chat ID is correctly linked to your user account
- Check server logs for command processing errors
- Run the `restart-telegram-bot.js` script to verify token validity

### Content Not Showing
- Create test activities using `create-test-activity.js`
- Generate test content using `test-content-generation-fixed.js`
- Verify that your MongoDB connection is working
- Check that the activity schema matches what the content generator expects

## Tips for Power Users

- **Quick Approval**: For multiple pending content items, use the interactive buttons instead of typing commands
- **Content Scheduling**: Use the Schedule button to select optimal posting times based on your audience
- **Regular Check**: Type `/pending` at the start of your day to see any content waiting for approval
- **Activity Check**: Type `/activities` to see what GitHub actions have been tracked
- **Local Testing**: Use ngrok for local development with webhook testing

## Support

If you encounter any issues or have questions about using the Telegram bot:

- Type `/help` in your chat with the bot
- Visit our documentation at https://devcast.app/docs
- Contact support at support@devcast.app

## Privacy

The DevCast Telegram bot only has access to the specific chat where you've added it. It will never:

- Access your other Telegram chats or contacts
- Send messages to other users or groups
- Access your Telegram media or files

All communication between DevCast and Telegram is secured with end-to-end encryption.

## Next Steps

We're continuously improving the DevCast Telegram experience. Upcoming features include:

- Analytics reporting via Telegram
- Weekly activity summaries
- Custom content templates
- Group chat support for teams
- Multi-platform posting (LinkedIn, etc.)
- Content scheduling enhancements
- Advanced editing capabilities
- User preference management through Telegram commands 