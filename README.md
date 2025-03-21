# DevCast

Activity test update: Updated on March 21, 2025 - Testing webhook URL configuration

A build-in-public agent that automatically creates social media content from your development activities. DevCast monitors your GitHub activity and crafts engaging social media updates for your Twitter/X, LinkedIn, and other social platforms - all manageable through a simple Telegram bot interface.

## Overview

DevCast helps developers showcase their work by automatically transforming technical GitHub activities into engaging social media content. The application monitors your commits, pull requests, issues, and releases, processes them with AI to create compelling posts, and publishes them to your connected social media accounts after your approval through a convenient Telegram interface.

## Features

- **GitHub Activity Tracking**: Automatically monitors commits, PRs, issues, and releases
- **Activity Management**: View and manage your GitHub activities through Telegram commands
- **AI-Powered Content Generation**: Transforms technical activities into engaging social media posts
  - Supports both OpenAI (GPT-4) and Anthropic (Claude) models
  - User-configurable AI provider preferences
- **Customizable Voice and Style**: Maintains your personal tone and writing style
- **Multi-Platform Publishing**: Posts to Twitter/X, LinkedIn, and other social platforms
- **Telegram-Based Approval Workflow**: Review and approve posts directly in Telegram
- **Interactive Command Interface**: Manage all aspects of your content through simple commands
- **Flexible Scheduling**: Set optimal posting times for maximum visibility

## Documentation Index

All project documentation is stored in the `docs/` folder. Here's a quick reference guide:

| Document | Description |
|----------|-------------|
| [ACTIVITY_STATUS_TRACKING.md](docs/ACTIVITY_STATUS_TRACKING.md) | Comprehensive guide to activity status lifecycle and implementation |
| [AI_INTEGRATION_SUMMARY.md](docs/AI_INTEGRATION_SUMMARY.md) | Overview of AI model integration for content generation |
| [DATABASE_ANALYSIS_REPORT.md](docs/database-analysis-report.md) | Comprehensive analysis of database structure and relationships |
| [DEVCAST_DIAGNOSTIC_REPORT.md](docs/devcast-diagnostic-report.md) | System diagnostic report with identified issues and recommendations |
| [DEVCAST_FIXES_APPLIED.md](docs/devcast-fixes-applied.md) | Documentation of fixes applied to address system issues |
| [DEVELOPMENT_NOTES.md](docs/DEVELOPMENT_NOTES.md) | Notes for developers working on the project |
| [ENHANCED_LOGGING.md](docs/ENHANCED_LOGGING.md) | Detailed guide to the structured logging system and its usage |
| [IMPLEMENTATION_NOTES.md](docs/IMPLEMENTATION_NOTES.md) | Details on implementation decisions and architecture |
| [LOGGING_IMPROVEMENTS.md](docs/LOGGING_IMPROVEMENTS.md) | Recommendations for improving the logging system |
| [LOGGING_SUMMARY.md](docs/LOGGING_SUMMARY.md) | Overview of the current logging infrastructure |
| [PROGRESS_SUMMARY.md](docs/PROGRESS_SUMMARY.md) | Summary of project progress and milestones |
| [PROMPT_ENGINEERING.md](docs/PROMPT_ENGINEERING.md) | Guide to AI prompt engineering for content generation |
| [TELEGRAM_GUIDE.md](docs/TELEGRAM_GUIDE.md) | Complete guide to Telegram bot integration and usage |
| [TESTING_SCRIPTS_GUIDE.md](docs/TESTING_SCRIPTS_GUIDE.md) | Comprehensive guide to testing scripts and utilities |
| [TWITTER_INTEGRATION.md](docs/TWITTER_INTEGRATION.md) | Details on Twitter API integration |
| [USING_CLAUDE.md](docs/USING_CLAUDE.md) | Guide to using Claude AI models for content generation |
| [WEBHOOK_QUICKSTART.md](docs/WEBHOOK_QUICKSTART.md) | Quick start guide for setting up GitHub webhooks |
| [WEBHOOK_STATUS.md](docs/WEBHOOK_STATUS.md) | Status report on webhook implementation |
| [WEBHOOK_TEST.md](docs/WEBHOOK_TEST.md) | Instructions for testing webhook functionality |
| [WEBHOOK_TROUBLESHOOTING.md](docs/WEBHOOK_TROUBLESHOOTING.md) | Guide to troubleshooting webhook issues |

## Testing Scripts Index

The project includes a variety of utility scripts for testing and debugging. For full details, see [TESTING_SCRIPTS_GUIDE.md](docs/TESTING_SCRIPTS_GUIDE.md).

Key script categories include:
- **API and Service Testing**: Scripts to test AI providers, content generation, and full content workflow
- **Twitter Integration Testing**: Utilities for validating Twitter API connectivity and posting
- **GitHub Webhook Testing**: Tools to simulate webhook events and test handlers
- **Telegram Bot Testing**: Scripts for bot management and command testing 
- **Database Utilities**: Tools for data inspection, repair, and standardization
- **System Configuration Testing**: Scripts to verify environment variables and API permissions

For usage instructions and detailed descriptions, refer to the testing scripts guide.

## Project Structure

```
devcast/
├── pages/                # Next.js pages directory
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── cron/         # Scheduled job endpoints
│   │   ├── users/        # User management endpoints
│   │   ├── activities/   # Activity management endpoints
│   │   ├── content/      # Content management endpoints
│   │   └── webhooks/     # GitHub webhook endpoint
│   ├── auth/             # Authentication pages
│   │   ├── signin.tsx    # Sign-in page
│   │   ├── signout.tsx   # Sign-out page
│   │   └── error.tsx     # Authentication error page
│   ├── dashboard/        # User dashboard pages
│   │   ├── index.tsx     # Main dashboard
│   │   └── settings.tsx  # User settings page
│   ├── _app.tsx          # Next.js app component
│   └── index.tsx         # Landing page
├── src/
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── models/           # Database models
│   │   ├── User.ts       # User model
│   │   ├── Activity.ts   # GitHub activity model
│   │   └── Content.ts    # Generated content model
│   ├── services/         # Core services
│   │   ├── githubService.ts    # GitHub API integration
│   │   ├── contentGenerator.ts # AI content generation
│   │   ├── twitterService.ts   # Twitter posting
│   │   ├── telegramService.ts  # Telegram approvals
│   │   └── scheduler.ts        # Background jobs
│   ├── styles/           # CSS/styling files
│   ├── types/            # TypeScript type declarations
│   │   ├── next-auth.d.ts      # Auth type extensions
│   │   ├── css.d.ts            # CSS module types
│   │   ├── jsx.d.ts            # JSX type extensions
│   └── utils/            # Utility functions
│       ├── database.ts   # Database connection
│       └── mongodb.ts    # MongoDB client
├── .github/              # GitHub configuration
│   └── workflows/        # GitHub Actions workflows
│       └── ci.yml        # CI/CD pipeline configuration
├── docs/                 # Documentation files
└── public/               # Static assets
```

## System Architecture

DevCast is built on a modern tech stack:

- **Next.js**: Full-stack React framework for the web API
- **MongoDB**: Database for storing user profiles, activities, and content
- **OpenAI**: AI-powered content generation
- **GitHub API**: Monitoring repository activities (via Octokit)
- **Twitter API**: Posting updates to Twitter/X (via twitter-api-v2)
- **Telegram Bot API**: Primary UI for approval workflow and management (via node-telegram-bot-api)

## Data Flow

1. **Activity Collection**:
   - GitHub webhooks notify DevCast of new activities in real-time
   - Scheduled jobs sync activities for all users periodically
   - Activities are stored in the database with metadata

2. **Content Generation**:
   - The scheduler triggers content generation for users with new activities
   - Activities are grouped by repository and the most active repo is selected
   - OpenAI API generates engaging content based on activity context
   - Content is stored as "pending" in the database

3. **Approval Flow**:
   - Generated content is sent to users via Telegram
   - Users can approve, reject, or edit the content with simple commands or interactive buttons
   - Status updates are stored in the database

4. **Publishing**:
   - Scheduler checks for approved content
   - Twitter API posts the content to user's Twitter/X account
   - Success notification is sent to user via Telegram
   - Analytics are updated periodically

## Authentication & Security

- NextAuth.js handles GitHub and Twitter OAuth
- JWT tokens are used for session management
- Sensitive tokens are stored securely in the database
- Telegram chat registration securely links user accounts with Telegram chat ID

## Primary Interface: Telegram Bot

DevCast uses a Telegram bot as the primary interface for users:

### Benefits
- Reduces context switching for developers
- Provides real-time notifications
- Enables quick approval workflow
- Works on all devices (mobile and desktop)
- Simple command-based interface

### Key Commands
- `/start` - Initialize the bot
- `/register` - Link Telegram to DevCast account
- `/activities` - View recent GitHub activities
- `/pending` - Review content waiting for approval
- `/help` - View all available commands

See [TELEGRAM_GUIDE.md](TELEGRAM_GUIDE.md) for detailed setup and usage instructions.

## Database Schema

### User
- Basic profile (name, email, image)
- GitHub connection (ID, username, access token)
- Twitter connection (ID, username, access token)
- Telegram connection (chat ID)
- Settings (posting frequency, style preferences)

### Activity
- Type (commit, PR, issue, release)
- Repository info
- Content (title, description)
- Metadata (timestamps, stats)
- Processing status

### Content
- Generated text
- Status (pending, approved, edited, rejected, posted)
- Related activities
- Publishing details (scheduled time, post ID, URL)
- Analytics (likes, retweets, impressions)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- GitHub account
- Twitter/X developer account
- Telegram account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/devcast.git
   cd devcast
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables file and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. Set up your environment variables in `.env.local`:
   - GitHub OAuth credentials
   - Twitter/X API credentials
   - Telegram Bot token
   - OpenAI API key
   - MongoDB connection string

5. Run the development server:
   ```bash
   npm run dev
   ```

### Configuration

After initial setup, you'll need to:

1. Connect your GitHub account
2. Connect your Twitter/X account
3. Set up your Telegram approval workflow
4. Configure your posting preferences and schedule

### Telegram Bot Setup

1. Create a new bot through BotFather in Telegram:
   - Search for `@BotFather` in Telegram
   - Send `/newbot` and follow the instructions
   - Save the bot token

2. Add the token to your environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_bot_token
   ```

3. Set up the webhook (requires public HTTPS URL):
   ```bash
   node scripts/setup-telegram-webhook.js https://your-domain.com/api/telegram/webhook
   ```

4. Link your Telegram chat with your DevCast account:
   - Send `/register` to your bot with your unique code
   - Or run the test user setup script for development

See [TELEGRAM_GUIDE.md](TELEGRAM_GUIDE.md) for detailed instructions.

## Development Guide

### Local Development
1. Start MongoDB locally or use MongoDB Atlas
2. Configure OAuth callbacks to point to localhost
3. Create a Telegram bot for testing

### Types and Linting
The project uses TypeScript with strict type checking:
- Run `npm run lint` to check for linting errors
- Install missing type definitions:
  ```bash
  npm install --save-dev @types/node @types/react @types/react-dom @types/jest
  npm install --save-dev @types/mongoose @types/mongodb @types/node-telegram-bot-api @types/testing-library__jest-dom
  ```

### Testing
- Unit tests for services and utilities
- Integration tests for API routes
- End-to-end testing for authentication flow
- Run tests with `npm test` or get coverage report with `npm run test:coverage`

## Debugging Features

DevCast includes a comprehensive logging system to help with troubleshooting and development:

### Enhanced Structured Logging System

DevCast implements a structured logging system for consistent, organized logs across all components:

- **Centralized Logger Utility**: Located at `src/utils/logger.ts`
- **Consistent Formatting**: Standardized timestamp + source + level + message format
- **Categorized Sources**: TELEGRAM, GITHUB, CLAUDE, and other service-specific logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR with configurable minimum level
- **Multiple Outputs**: Console and daily log files with special handling for errors
- **Specialized AI Logging**: Detailed tracking of AI interactions with metrics

### Logger Features

- **Source-Specific Loggers**: Specialized methods for each service:
  ```typescript
  // General logging
  logger.info('SYSTEM', 'Application started');
  
  // Service-specific logging
  logger.telegram.info('Received message from user');
  logger.github.debug('Processing webhook payload');
  
  // AI interaction logging with metrics
  logger.ai.logInteraction('CLAUDE', userId, 'Generate tweet', contextData, response, {
    inputTokens: 523,
    outputTokens: 42,
    duration: 2451
  });
  ```

- **Organized Log Files**:
  - Daily logs in `logs/YYYY-MM-DD.log`
  - Consolidated error logs in `logs/errors.log`

- **Runtime Configuration**:
  ```typescript
  // Configure logger at runtime
  logger.configure({
    minLevel: LogLevel.DEBUG,
    logToConsole: true,
    logToFile: true,
    logDirectory: 'custom-logs',
    logAIFullResponses: true
  });
  ```

### Testing the Logger

The repository includes a test script to verify logger functionality:

```bash
node -r ts-node/register scripts/test-logger.js
```

This script simulates a typical content generation flow and demonstrates all logging features.

### Implementation

- All major services have been updated to use the structured logger
- Legacy console.log calls have been replaced with appropriate logger methods
- Error handling has been improved across the codebase
- GitHub webhook handler and Telegram service use service-specific loggers

### Future Logging Improvements

- Add log rotation to manage file sizes
- Implement remote logging service integration
- Create a web-based log viewer in the admin dashboard
- Add performance metrics logging

### Known Issues

- Log files may not be created consistently during normal operation
- The application has permission to create files, but the logging mechanism may encounter issues when running as a service
- For best results in troubleshooting, run the application with `console.log` output visible

### Future Improvements

- Add structured logging with levels (info, warn, error)
- Implement log rotation to manage file sizes
- Add configurable log destinations (file, console, remote service)
- Improve error reporting with more detailed context

### Deployment
- Vercel for Next.js hosting

## Recent Implementation Changes

### AI Content Generation

- Upgraded to Claude 3.7 Sonnet with a specialized system prompt
- Enhanced prompt engineering for direct content generation and platform-specific formatting
- Improved post-processing to clean outputs and ensure platform compatibility
- Added metadata storage for debugging and enhanced error handling

### Activity Status Tracking

Full details are available in [ACTIVITY_STATUS_TRACKING.md](docs/ACTIVITY_STATUS_TRACKING.md).

- **Complete Lifecycle**: Implemented pending → processed → published status transitions
- **Status Updates**: Added triggers in ContentGenerator and TelegramService
- **Data Consistency**: Created scripts to fix historical inconsistencies
- **User Experience**: Enhanced status visibility in user notifications and commands

### Telegram Service

- Added enhanced command processing with improved error handling
- Implemented AI provider selection via `/ai` command
- Added progress and status messages for long-running operations
- Created fallback content generation for service failures

### Error Handling and Resilience

- Added specific handling for different API error types
- Implemented exponential backoff for retryable errors
- Created fallback mechanisms between AI providers
- Enhanced error reporting and user-friendly messages

## GitHub Webhook Integration

DevCast receives real-time notifications about repository events through GitHub webhooks. For detailed setup and troubleshooting, see [WEBHOOK_QUICKSTART.md](docs/WEBHOOK_QUICKSTART.md).

### Key Features
- Real-time activity capture from GitHub repositories
- Secure request verification via HMAC-SHA256 signatures
- Automatic activity creation in the database
- Integration with content generation pipeline

### Recent Improvements
- Fixed field naming inconsistencies and schema validation
- Organized specialized fields in a dedicated metadata object
- Enhanced development mode for local testing
- Improved error handling throughout the webhook flow

## Next Steps

### 1. Complete Testing Framework
- Fix remaining mongoose mocking issues in API tests
- Add tests for utility functions and hooks
- Implement integration tests for key user flows
- Set up end-to-end testing for critical features
- Integrate test coverage reporting with CI/CD pipeline

### 2. Dashboard Integration
- Integrate ActivityList and ActivityCard components into the main dashboard
- Create dedicated activity management pages:
  - Activity queue for processing
  - Preview page for processed content
  - Publishing workflow with social media previews
- Add activity filtering and search functionality

### 3. Content Generation Enhancements
- Replace placeholder content generator with actual OpenAI integration
- Implement customizable content styles and tones
- Add support for image generation for visual content
- Create content preview with social media card simulation

### 4. Social Media Integration
- Complete Twitter/X API integration for posting
- Add LinkedIn posting capabilities
- Implement analytics tracking for published posts
- Create scheduling system for optimal posting times

### 5. GitHub Integration
- Set up GitHub webhook handler for real-time activity tracking
- Implement repository filtering and prioritization
- Add support for organization accounts
- Create GitHub App for improved API access

### 6. Deployment & Production Readiness
- Complete Vercel configuration
- Set up MongoDB Atlas for production
- Configure environment variables for production
- Set up monitoring and logging
- Implement rate limiting and caching strategies

## Development Roadmap

### Phase 1: Core Features (Completed)
- GitHub authentication and activity monitoring
- Basic dashboard UI and settings management
- API endpoints for data management
- CI/CD pipeline setup

### Phase 2: Enhanced Experience (Current)
- Improved content generation and customization
- Better mobile experience and UI refinements
- Comprehensive testing and error handling
- Production deployment preparation

### Phase 3: Advanced Features (Upcoming)
- Enhanced analytics and insights
- Multi-platform social posting
- Rich media content generation
- User community and template sharing

## License

This project is licensed under the MIT License - see the LICENSE file for details. 