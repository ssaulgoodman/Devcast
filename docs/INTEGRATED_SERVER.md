# Integrated Development Server

DevCast features an integrated development server that combines the Next.js application and Telegram bot in a single process. This document outlines how to use this setup and its technical implementation.

## Overview

The integrated server addresses a common development workflow issue: the need to run multiple components (Next.js and Telegram bot) simultaneously. Rather than managing separate terminal windows and processes, the integrated approach allows you to start both components with a single command.

## Usage

### Starting the Server

Start the integrated server using either:

```bash
# Using npm script
npm run dev

# OR using the convenience script
./start.sh
```

### Stopping the Server

To stop the server gracefully:

1. Press `Ctrl+C` in the terminal where the server is running
2. Or use the stop script: `./stop.sh`

### Alternative Modes

If you need to run components separately:

```bash
# Run only Next.js without the Telegram bot
npm run dev:next-only

# Run only the Telegram bot
node scripts/start-telegram-polling.js
```

## Technical Implementation

### Components

The integrated server consists of:

1. **Custom Next.js Server** (`server.js`):
   - Initializes Next.js with custom configuration
   - Handles HTTP requests
   - Starts the Telegram bot after Next.js is ready

2. **Enhanced Telegram Bot Module** (`scripts/start-telegram-polling.js`):
   - Modified to work both standalone and when imported
   - Includes proper database connection management
   - Provides graceful shutdown capability

3. **Utility Scripts**:
   - `start.sh`: Convenience script with port conflict resolution
   - `stop.sh`: Clean shutdown of all components

### How It Works

1. The server script initializes Next.js and sets up HTTP handlers
2. After the HTTP server is listening, it imports the Telegram bot module
3. The Telegram bot connects to MongoDB (if not already connected)
4. Both components run in the same Node.js process, sharing resources
5. SIGINT handlers ensure both components shut down properly

### Configuration

The server can be configured with environment variables:

- `PORT`: HTTP port for Next.js (default: 3000)
- `MONGODB_URI`: MongoDB connection string
- `TELEGRAM_BOT_TOKEN`: Telegram Bot API token

### Error Handling

The integrated server includes error handling for:

- Port conflicts (with instructions on how to resolve)
- MongoDB connection failures
- Telegram bot initialization failures

## Troubleshooting

### Port Conflicts

If you see "EADDRINUSE: address already in use" errors:

1. Use `./stop.sh` to shut down any running instances
2. Set a different port: `PORT=3001 npm run dev`
3. Check for other applications using port 3000

### MongoDB Connection Issues

If the Telegram bot fails to connect to MongoDB:

1. Verify your MongoDB connection string in `.env.local`
2. Ensure the MongoDB server is running
3. Check network connectivity and firewall settings

### Telegram Bot Errors

If the Telegram bot fails to start:

1. Verify your `TELEGRAM_BOT_TOKEN` in `.env.local`
2. Check the Telegram API status
3. Inspect the logs for specific error messages

## Future Improvements

Potential enhancements for the integrated server include:

1. **Process Management**: Add PM2 integration for production deployments
2. **Hot Reloading**: Improve development experience with better hot reloading
3. **Clustering**: Support for multi-core scaling in production
4. **Metrics**: Performance and health monitoring
5. **Web Interface**: Admin dashboard for monitoring components 