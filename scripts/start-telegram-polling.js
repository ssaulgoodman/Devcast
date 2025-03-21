/**
 * Start Telegram Bot in Polling Mode with Database Connection
 * 
 * This script initializes the TelegramService with a proper database connection
 * and starts the polling for messages.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Get the absolute path to the project root directory
const projectRoot = path.resolve(__dirname, '..');

// Read the tsconfig.json file
const tsconfig = JSON.parse(fs.readFileSync(path.join(projectRoot, 'tsconfig.json'), 'utf8'));

// Register TypeScript Node to handle .ts files
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    ...tsconfig.compilerOptions,
    module: 'commonjs',
  }
});

// Register tsconfig-paths to resolve module aliases
const tsConfigPaths = require('tsconfig-paths');
tsConfigPaths.register({
  baseUrl: projectRoot,
  paths: { '@/*': ['*', 'src/*'] }
});

// MongoDB connection state
let isConnected = false;
let telegramService = null;
let hasConflictError = false;
let pollingRetries = 0;
const MAX_POLLING_RETRIES = 3;

/**
 * Connect to MongoDB if not already connected
 */
async function connectToMongoDB() {
  // Skip if already connected
  if (isConnected) {
    return Promise.resolve();
  }

  // Connect to MongoDB
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not defined');
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  console.log('Connecting to MongoDB for Telegram bot...');
  return mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('MongoDB connected successfully for Telegram bot');
      isConnected = true;
    });
}

/**
 * Start the Telegram bot
 */
async function startBot() {
  try {
    // Connect to MongoDB first if needed
    if (!isConnected) {
      await connectToMongoDB();
    }
    
    // Import TelegramService dynamically after setting up ts-node
    const { TelegramService } = require('../src/services/telegramService');
    
    // Initialize the Telegram service
    console.log('Initializing TelegramService...');
    telegramService = new TelegramService();
    
    // Add error handling for Telegram conflicts
    telegramService.getBot().on('polling_error', (error) => {
      if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
        if (!hasConflictError) {
          console.error('\n[TELEGRAM] Error: Another instance of this bot is already running.');
          console.error('[TELEGRAM] Consider using ./stop.sh to stop all running instances first.');
          hasConflictError = true;
          
          // If we're in standalone mode, exit the process after multiple retries
          if (require.main === module && ++pollingRetries >= MAX_POLLING_RETRIES) {
            console.error(`[TELEGRAM] Exiting after ${MAX_POLLING_RETRIES} failed retries due to conflict`);
            stopBot().then(() => process.exit(1));
          }
        }
      } else {
        console.error('[TELEGRAM] Polling error:', error);
      }
    });
    
    // Start polling
    console.log('Starting polling for messages...');
    telegramService.startPolling();
    
    console.log('Bot is now polling for updates!');
    
    // Handle shutdown when run as a standalone script
    if (require.main === module) {
      console.log('Press Ctrl+C to stop the bot.');
      
      // Keep the process running
      process.stdin.resume();
      process.on('SIGINT', () => {
        stopBot().then(() => process.exit(0));
      });
    }
    
    return telegramService;
  } catch (error) {
    console.error('Error starting Telegram bot:', error);
    console.error(error.stack);
    await stopBot();
    
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

/**
 * Stop the Telegram bot and disconnect from MongoDB
 */
async function stopBot() {
  console.log('Stopping Telegram bot...');
  
  // Stop polling if the bot is running
  if (telegramService) {
    try {
      console.log('Stopping Telegram polling...');
      telegramService.stopPolling();
      console.log('Telegram polling stopped');
    } catch (err) {
      console.error('Error stopping Telegram polling:', err);
    }
  }
  
  // Disconnect from MongoDB if we were responsible for connecting
  if (isConnected) {
    try {
      await mongoose.disconnect();
      console.log('MongoDB disconnected for Telegram bot');
      isConnected = false;
    } catch (err) {
      console.error('Error disconnecting from MongoDB:', err);
    }
  }
}

// When run directly (not imported)
if (require.main === module) {
  console.log('Starting Telegram Bot in polling mode (standalone)...');
  startBot();
}

// Export functions for use when imported
module.exports = {
  startBot,
  stopBot
}; 