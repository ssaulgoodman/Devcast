/**
 * Telegram Bot Restart Script
 * 
 * This script helps restart the Telegram bot with proper token configuration.
 * It can be used to fix token-related issues.
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

console.log('Using Telegram Bot Token:', TELEGRAM_BOT_TOKEN);

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
    
    console.log('Current webhook configuration:');
    console.log(JSON.stringify(currentWebhook, null, 2));
    
    // Get bot information to verify token
    console.log('\nVerifying bot token by getting bot information...');
    const botInfo = await makeRequest('getMe');
    console.log(`Bot name: ${botInfo.first_name}`);
    console.log(`Bot username: @${botInfo.username}`);
    console.log(`Bot ID: ${botInfo.id}`);
    
    // Send a test message to verify the bot can send messages
    if (process.argv[2]) {
      const chatId = process.argv[2];
      console.log(`\nSending test message to chat ID: ${chatId}`);
      const message = await makeRequest('sendMessage', {
        chat_id: chatId,
        text: 'Test message from DevCast Bot. If you received this, the bot is working correctly!'
      });
      console.log('Test message sent successfully!');
    } else {
      console.log('\nNo chat ID provided. To send a test message, run:');
      console.log(`node scripts/restart-telegram-bot.js YOUR_CHAT_ID`);
    }
    
    console.log('\nBot verification complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 