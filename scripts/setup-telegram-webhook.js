/**
 * Telegram Webhook Setup Script
 * 
 * This script sets up the webhook URL for the Telegram bot
 * to receive updates through the webhook endpoint.
 * 
 * Usage:
 *   node scripts/setup-telegram-webhook.js [webhook-url]
 */

require('dotenv').config();
const https = require('https');
const url = require('url');

// Get the Telegram bot token from environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not defined in your environment variables');
  process.exit(1);
}

// Get the webhook URL from command line arguments or prompt for it
const webhookUrl = process.argv[2];

if (!webhookUrl) {
  console.error('Error: Please provide your webhook URL as a command line argument');
  console.error('Usage: node scripts/setup-telegram-webhook.js https://your-domain.com/api/telegram/webhook');
  process.exit(1);
}

// Validate the webhook URL
try {
  const parsedUrl = new URL(webhookUrl);
  if (parsedUrl.protocol !== 'https:') {
    console.error('Error: Webhook URL must use HTTPS protocol');
    process.exit(1);
  }
} catch (error) {
  console.error('Error: Invalid webhook URL');
  process.exit(1);
}

// Function to make HTTP requests to the Telegram API
function makeRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`;
    const parsedUrl = url.parse(apiUrl);
    
    const data = JSON.stringify(params);
    
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseData);
          if (parsedResponse.ok) {
            resolve(parsedResponse.result);
          } else {
            reject(new Error(`API error: ${parsedResponse.description}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(data);
    req.end();
  });
}

// Main function
async function main() {
  try {
    console.log('Getting current webhook information...');
    const currentWebhook = await makeRequest('getWebhookInfo');
    
    if (currentWebhook.url) {
      console.log(`Current webhook: ${currentWebhook.url}`);
      console.log(`Pending update count: ${currentWebhook.pending_update_count}`);
      
      // If the webhook is already set to our URL, no need to change it
      if (currentWebhook.url === webhookUrl) {
        console.log('Webhook already set to the provided URL');
        process.exit(0);
      }
      
      // Delete the current webhook
      console.log('Deleting current webhook...');
      await makeRequest('deleteWebhook');
    }
    
    // Set the new webhook
    console.log(`Setting webhook to ${webhookUrl}...`);
    const result = await makeRequest('setWebhook', {
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query']
    });
    
    console.log('Webhook set successfully!');
    console.log('Verification result:', result);
    
    // Get the bot's information
    console.log('Getting bot information...');
    const botInfo = await makeRequest('getMe');
    console.log(`Bot name: ${botInfo.first_name}`);
    console.log(`Bot username: @${botInfo.username}`);
    
    console.log('\nSetup complete! Your Telegram bot is now configured to receive updates through the webhook.');
    console.log('You can test it by sending a message to your bot on Telegram.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main(); 