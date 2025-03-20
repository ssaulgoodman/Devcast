# Changelog

All notable changes to the DevCast project will be documented in this file.

## [Unreleased]

### Added
- New testing utilities for webhook integration:
  - `webhook-test.js`: Simulates GitHub webhook events
  - `create-test-activity.js`: Creates test activities directly in the database
  - `show-activities.js`: Displays detailed activity information
- Development mode support for webhook testing without real GitHub events
- Comprehensive documentation for webhook integration:
  - Updated README.md with webhook section
  - Added WEBHOOK_QUICKSTART.md for rapid setup
  - Added WEBHOOK_TROUBLESHOOTING.md for common issues

### Fixed
- Field name inconsistencies in GitHubService:
  - Renamed `user` → `userId` to match schema
  - Renamed `repository` → `repo` to match schema
  - Aligned field names across all activity types
- Webhook signature verification issues
- Activity model validation errors
- Metadata structure for activities to improve schema compliance
- Development mode detection and fallback functionality

### Changed
- Improved error handling in webhook processing
- Enhanced logging for better debugging
- Restructured GitHubService to use consistent field naming
- Reorganized non-standard fields into metadata object for better organization

## [0.1.0] - 2025-03-20

### Added
- Initial project setup with Next.js
- GitHub OAuth integration
- MongoDB database connection
- Basic user management
- GitHub activity tracking
- Webhook endpoint for GitHub events 