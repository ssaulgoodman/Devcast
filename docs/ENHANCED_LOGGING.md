# Enhanced Logging System

This document describes the enhanced logging system implemented in DevCast. The system provides consistent, structured logging across all components of the application.

## Overview

The enhanced logging system centralizes all logging through a single utility (`src/utils/logger.ts`), providing consistent formatting, multiple output destinations, and specialized handling for different service areas.

### Key Features

- **Consistent Format**: All logs follow the format `[timestamp] [source][level] message`
- **Log Levels**: DEBUG, INFO, WARN, ERROR with configurable minimum level
- **Service-Specific Logging**: Specialized methods for Telegram, GitHub, and AI components
- **Multiple Outputs**: Console and daily log files
- **Error Consolidation**: All errors are also written to a dedicated error log
- **AI Interaction Tracking**: Special handling for AI requests and responses with metrics

## Log Structure

Each log entry includes:

- **Timestamp**: ISO 8601 format for precise timing
- **Source**: Component or service generating the log (e.g., TELEGRAM, GITHUB, CLAUDE)
- **Level**: Severity level (DEBUG, INFO, WARN, ERROR)
- **Message**: The actual log message
- **Optional Data**: Additional data or objects in JSON format

## Usage

### Basic Logging

```typescript
// Import the logger
import logger from '@/utils/logger';

// General purpose logging with source
logger.info('SYSTEM', 'Application started');
logger.debug('DB', 'Connected to database', { host: 'mongodb://localhost', status: 'connected' });
logger.warn('AUTH', 'Failed login attempt', { username: 'user123', attempts: 3 });
logger.error('API', 'Failed to process request', error);
```

### Service-Specific Logging

```typescript
// Telegram-specific logging
logger.telegram.info('Received command: /activities from user 123456789');
logger.telegram.debug('Processing activities for user', { userId: '123456789', count: 5 });
logger.telegram.warn('Rate limit approaching', { currentRate: 18, maxRate: 20 });
logger.telegram.error('Failed to send message', error);

// GitHub-specific logging
logger.github.info('Received webhook: push event');
logger.github.debug('Processing payload', { repository: 'user/repo', event: 'push' });
logger.github.warn('Invalid webhook signature received');
logger.github.error('Failed to process webhook', error);
```

### AI Interaction Logging

```typescript
// Log AI interactions with metrics
logger.ai.logInteraction(
  'CLAUDE',                   // AI provider
  '123456789',                // User ID
  'Generate tweet',           // Request summary
  'Context: 3 recent commits', // Context summary
  'Generated response text',   // Full AI response
  {                           // Metrics
    inputTokens: 523,
    outputTokens: 42,
    duration: 2451            // ms
  }
);
```

## Configuration

The logger can be configured at runtime:

```typescript
logger.configure({
  minLevel: LogLevel.DEBUG,        // Minimum log level to record
  logToConsole: true,              // Whether to log to console
  logToFile: true,                 // Whether to log to files
  logDirectory: 'logs',            // Directory for log files
  logAIFullResponses: false        // Whether to log complete AI responses
});
```

### Environment Variables

The logger behavior can be influenced by environment variables:

- `NODE_ENV`: When set to 'production', the default minimum log level is INFO
- `LOG_LEVEL`: Can be set to override the minimum log level

## Log Files

The logger creates a small set of well-organized log files:

- **Daily Logs**: `logs/YYYY-MM-DD.log` - All logs from a particular day
- **Error Logs**: `logs/errors.log` - All ERROR level logs consolidated

These are the only log files that should be generated. Any other log files (like `claude-debug.log`, `telegram-debug.log`, etc.) are from legacy logging mechanisms and can be safely deleted using the cleanup script:

```bash
node scripts/cleanup-logs.js
```

## Implementation Details

### Dependencies

The logger uses Node.js built-in modules only:
- `fs` - For file operations
- `path` - For path handling

### Error Handling

The logger has built-in error handling to avoid crashing the application:
- If log directory creation fails, it defaults to console-only logging
- File write errors are logged to console but don't stop the application

### Logging Large Objects

For large objects or responses:
- Objects are serialized to JSON
- Long responses are truncated in INFO logs
- Full responses are available in DEBUG logs when enabled

## Integration with Services

### Telegram Service

The Telegram service has been updated to use structured logging for:
- Command processing
- Activity retrieval and formatting
- Content generation and approval workflow
- Error handling and troubleshooting

### GitHub Webhook Handler

The GitHub webhook handler uses structured logging for:
- Request validation and authentication
- User lookup and activity processing
- Detailed error reporting for webhooks

### Future Integrations

Planned integrations include:
- Content Generator service
- Twitter/Social Media services
- Authentication flows
- NextAuth integration

## Testing

A test script is provided to demonstrate and verify the logging functionality:

```bash
node -r ts-node/register scripts/test-logger.js
```

This script simulates a typical workflow including:
1. Receiving a command from Telegram
2. Fetching GitHub activities
3. Generating content with an AI provider
4. Sending the result back to Telegram

## Best Practices

1. **Use the Right Log Level**:
   - DEBUG: Detailed information, helpful for debugging
   - INFO: Confirmation that things are working as expected
   - WARN: Warning that something might be wrong, but the application can continue
   - ERROR: Something has failed and requires attention

2. **Be Specific with Service Sources**:
   - Use the specialized loggers (telegram, github, ai) when possible
   - For other areas, use a consistent source identifier

3. **Include Contextual Information**:
   - Always include relevant IDs (userId, activityId, etc.)
   - For errors, include the error object for stack traces

4. **Don't Log Sensitive Information**:
   - Never log access tokens, API keys, or user credentials
   - Be careful with user-generated content that might contain sensitive data 