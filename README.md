# DevCast

A build-in-public agent that automatically creates social media content from your development activities. DevCast monitors your GitHub activity and crafts engaging social media updates for your Twitter/X, LinkedIn, and other social platforms.

## Overview

DevCast helps developers showcase their work by automatically transforming technical GitHub activities into engaging social media content. The application monitors your commits, pull requests, issues, and releases, processes them with AI to create compelling posts, and publishes them to your connected social media accounts after your approval.

## Features

- **GitHub Activity Tracking**: Automatically monitors commits, PRs, issues, and releases
- **Activity Management**: View, filter, and manage your GitHub activities through an intuitive dashboard
- **AI-Powered Content Generation**: Transforms technical activities into engaging social media posts
- **Customizable Voice and Style**: Maintains your personal tone and writing style
- **Multi-Platform Publishing**: Posts to Twitter/X, LinkedIn, and other social platforms
- **Approval Workflow**: Review and approve posts before they go live
- **Analytics Dashboard**: Track engagement metrics for your development content
- **Flexible Scheduling**: Set optimal posting times for maximum visibility

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
└── public/               # Static assets
```

## System Architecture

DevCast is built on a modern tech stack:

- **Next.js**: Full-stack React framework for the web UI and API routes
- **MongoDB**: Database for storing user profiles, activities, and content
- **OpenAI**: AI-powered content generation
- **GitHub API**: Monitoring repository activities (via Octokit)
- **Twitter API**: Posting updates to Twitter/X (via twitter-api-v2)
- **Telegram Bot API**: User-friendly approval flow (via node-telegram-bot-api)

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
   - Users can approve, reject, or edit the content with simple commands
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
- Telegram chat registration links user accounts

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

### Deployment
- Vercel for Next.js hosting
- MongoDB Atlas for database
- Vercel Cron for scheduled tasks

## Recent Progress

### UI Implementation
- **Authentication Pages**: Added comprehensive sign-in, sign-out, and error pages
- **Dashboard Interface**: Created a responsive dashboard to view activities and content
- **Settings Management**: Implemented a user settings page with customization options
- **Responsive Design**: Ensured UI works well on mobile and desktop devices

### API Development
- **User Settings API**: Created endpoints for fetching and updating user preferences
- **Activities API**: Implemented robust endpoints for GitHub activity management:
  - List, create, update, and delete activities
  - Process activities with AI content generation
  - Publish processed activities to social media
- **Content API**: Added endpoints for content creation, approval, and publishing

### Activities Tracking & Social Sharing
- **Activity Components**: Built reusable UI components for displaying GitHub activities:
  - `ActivityCard`: Displays individual GitHub activities with appropriate visual styling based on type
  - `ActivityList`: Shows paginated activities with filtering capabilities
  - `PaginationControls`: Reusable pagination component with accessibility features
- **Activity Service Layer**: Created a comprehensive service layer for activity management:
  - Fetching activities with pagination and filtering
  - Creating, updating, and deleting activities
  - Processing activities with AI content generation
  - Publishing processed activities to social media
- **Database Model**: Implemented MongoDB schema for activities with appropriate indexes and utility methods
- **Testing**: Created extensive test coverage for components and services

### Testing Infrastructure
- **Jest Configuration**: Set up Jest with Next.js for comprehensive testing
- **Component Testing**: Implemented React Testing Library for testing UI components
- **API Testing**: Added tests for API endpoints with proper mocking of external dependencies
- **Service Testing**: Created tests for service layer functions with mocked HTTP requests
- **Mock Implementation**: Set up mocks for:
  - Next.js router and next-auth authentication
  - Axios HTTP client
  - MongoDB database and Mongoose ORM
  - External services (GitHub, Twitter/X, OpenAI)

### TypeScript and Code Quality Improvements
- **Enhanced Type Safety**: Improved type definitions across the codebase
  - Properly defined interfaces for Content, User, and Activity models
  - Added appropriate type guards and null checks
  - Implemented consistent error handling with proper typing
- **Fixed API Service Types**: Resolved interface inconsistencies in service layers
  - Updated Content model usage to use IContent interface consistently
  - Fixed return types in GitHub, Twitter, and Telegram services
  - Ensured null safety in telegramService and user property access
- **Testing Polyfills**: Added proper TextEncoder and TextDecoder polyfills for Node.js environment
- **Mongoose Mocking**: Improved mocking strategy for MongoDB ObjectId in tests
- **Test Coverage Improvement**: Achieved 100% pass rate on all test suites
- **Build Optimization**: Ensured clean Next.js builds with no TypeScript errors

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