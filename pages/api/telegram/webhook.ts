import { NextApiRequest, NextApiResponse } from 'next';
import connectDB from '@/utils/database';
import TelegramBot from 'node-telegram-bot-api';
import { TelegramService } from '@/services/telegramService';

// Connect to database
connectDB();

// Initialize Telegram service singleton
let telegramService: TelegramService;

/**
 * Telegram webhook endpoint for receiving bot commands
 * 
 * This endpoint handles incoming messages from Telegram and processes them
 * through our command handlers.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('Received non-POST request to Telegram webhook');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Log the full request for debugging
    console.log('Received Telegram webhook request:');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    // Initialize the TelegramService if not already initialized
    if (!telegramService) {
      console.log('Initializing TelegramService');
      try {
        telegramService = new TelegramService();
        console.log('TelegramService initialized successfully');
      } catch (error) {
        console.error('Error initializing TelegramService:', error);
        throw error;
      }
    }
    
    // Get the update from Telegram
    const update = req.body;
    
    // Process the update
    console.log('Processing update...');
    await processUpdate(update);
    console.log('Update processed successfully');
    
    // Acknowledge receipt to Telegram
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error processing Telegram webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Process a Telegram update
 */
async function processUpdate(update: any) {
  // Initialize the Telegram service if needed
  if (!telegramService) {
    telegramService = new TelegramService();
  }
  
  try {
    // For now, we'll just log the update
    // In production, you would delegate to the TelegramService to handle commands
    if (update.message) {
      const { chat, text } = update.message;
      console.log(`Received message from chat ${chat.id}: ${text}`);
      
      // Process commands
      if (text && text.startsWith('/')) {
        console.log(`Processing command: ${text}`);
        try {
          await telegramService.handleCommand(update.message);
          console.log('Command processed successfully');
        } catch (error) {
          console.error('Error handling command:', error);
        }
      }
    } 
    // Handle callback queries (button presses)
    else if (update.callback_query) {
      console.log('Received callback query:', update.callback_query.data);
      try {
        await telegramService.handleCallback(update.callback_query);
        console.log('Callback processed successfully');
      } catch (error) {
        console.error('Error handling callback:', error);
      }
    }
  } catch (error) {
    console.error('Error processing Telegram update:', error);
  }
} 