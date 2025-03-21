const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get port from environment or use default 3000
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Start Telegram bot in the same process
async function startTelegramBot() {
  try {
    // Dynamically import the Telegram bot code
    const telegramModule = require('./scripts/start-telegram-polling');
    
    // Start the bot
    await telegramModule.startBot();
    console.log('[SERVER] Telegram bot polling started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('[SERVER] Shutting down...');
      
      // Stop the Telegram bot
      await telegramModule.stopBot();
      
      // Exit the process
      process.exit(0);
    });
  } catch (error) {
    console.error('[SERVER] Failed to start Telegram bot:', error);
  }
}

// Prepare and start both the Next.js server and Telegram bot
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Handle server errors
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`[SERVER] Port ${port} is already in use. Please free it or use a different port.`);
      console.error('[SERVER] You can set a different port with the PORT environment variable.');
      process.exit(1);
    } else {
      console.error('[SERVER] Server error:', e);
      process.exit(1);
    }
  });

  // Start listening
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`[SERVER] Next.js server ready on http://localhost:${port}`);
    
    // Start the Telegram bot after the server is ready
    startTelegramBot();
  });
}); 