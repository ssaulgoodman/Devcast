/**
 * Test script for the improved logger
 * 
 * This script demonstrates the usage of the enhanced logger by simulating
 * a typical content generation flow involving Telegram and AI interactions.
 */

// Try to import the TypeScript logger
let logger;
try {
  require('ts-node/register');
  logger = require('../src/utils/logger').default;
  console.log('Successfully imported TypeScript logger');
} catch (error) {
  console.log('Failed to import TS logger:', error.message);
  
  // Create a simple JS version for testing
  console.log('Creating basic JS version for testing...');
  
  logger = {
    telegram: {
      info: (msg) => console.log(`[TELEGRAM][INFO] ${msg}`),
      debug: (msg) => console.log(`[TELEGRAM][DEBUG] ${msg}`),
    },
    github: {
      info: (msg) => console.log(`[GITHUB][INFO] ${msg}`),
    },
    ai: {
      logInteraction: (provider, userId, request, context, response, metrics) => {
        console.log(`[${provider}][INFO] Request for user ${userId}: ${request}`);
        console.log(`[${provider}][DEBUG] Context: ${context}`);
        console.log(`[${provider}][INFO] Response: ${response.substring(0, 100)}...`);
        if (metrics) {
          console.log(`[${provider}][INFO] Metrics: ${JSON.stringify(metrics)}`);
        }
      }
    }
  };
}

// Simulate receiving a command from Telegram
logger.telegram.info('Received command: /generate a tweet about our recent webhook improvements from user 1234567890');

// Simulate fetching GitHub activities
logger.github.info('Fetching recent activities for repository: ssaulgoodman/Devcast');
logger.github.info('Found 3 recent activities');

// Simulate content generation using Claude
const aiRequestSummary = 'generate a tweet about our recent webhook improvements';
const aiContext = `Repository: ssaulgoodman/Devcast
Activity Summary: 3 commits
Recent Activities:
- [COMMIT] Fix webhook handler to support multiple User schema formats
- [COMMIT] Add logging improvements
- [COMMIT] Update README with webhook documentation`;

const aiResponse = "Just shipped major improvements to DevCast's webhook handling! 🚀 Now supporting multiple user schemas, improved error logging, and better documentation. Check out our latest commits at github.com/ssaulgoodman/Devcast #DevTools #OpenSource";

// Metrics object that matches the TypeScript interface
const metrics = {
  inputTokens: 523,
  outputTokens: 42,
  duration: 2451 // ms
};

// Log the AI interaction
logger.ai.logInteraction(
  'CLAUDE',
  '1234567890',
  aiRequestSummary,
  aiContext,
  aiResponse,
  metrics
);

// Simulate sending content back to Telegram
logger.telegram.info('Sending generated content to user 1234567890');
logger.telegram.debug('Adding approval buttons to message');

console.log('Logger test completed'); 