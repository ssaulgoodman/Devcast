/**
 * Log Cleanup Script
 * 
 * This script:
 * 1. Removes old debug log files scattered throughout the project
 * 2. Ensures a proper logs directory structure exists
 * 3. Creates standard daily log files
 * 
 * Run with: node scripts/cleanup-logs.js
 */

const fs = require('fs');
const path = require('path');

// Files to clean up
const oldLogFiles = [
  'telegram-debug.log',
  'claude-debug.log',
  'direct-debug.log',
  'fallback-debug.log',
  'openai-debug.log',
  'claude-fallback.log',
  'direct-test.log',
  'debug-logs.txt'
];

// Find and delete all claude-request-*.log files
const findAndDeleteRequestLogs = () => {
  const files = fs.readdirSync(process.cwd());
  const requestLogs = files.filter(file => 
    file.startsWith('claude-request-') || 
    file.startsWith('generate-request-')
  );
  
  console.log(`Found ${requestLogs.length} request log files to clean up`);
  
  let deleted = 0;
  for (const file of requestLogs) {
    try {
      fs.unlinkSync(path.join(process.cwd(), file));
      deleted++;
    } catch (error) {
      console.error(`Error deleting ${file}:`, error.message);
    }
  }
  
  console.log(`Deleted ${deleted} request log files`);
};

// Clean up old log files
const cleanupOldLogs = () => {
  console.log('Cleaning up old log files...');
  
  let deleted = 0;
  for (const file of oldLogFiles) {
    const filePath = path.join(process.cwd(), file);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file}`);
        deleted++;
      } catch (error) {
        console.error(`Error deleting ${file}:`, error.message);
      }
    }
  }
  
  console.log(`Deleted ${deleted} old log files`);
};

// Ensure logs directory structure
const ensureLogDirectory = () => {
  console.log('Setting up logs directory...');
  
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('Created logs directory');
  } else {
    console.log('Logs directory already exists');
  }
  
  // Create today's log file if it doesn't exist
  const today = new Date().toISOString().split('T')[0];
  const todayLogFile = path.join(logsDir, `${today}.log`);
  
  if (!fs.existsSync(todayLogFile)) {
    const timestamp = new Date().toISOString();
    fs.writeFileSync(todayLogFile, `[${timestamp}] [SYSTEM][INFO] Log file created\n`);
    console.log(`Created today's log file: ${today}.log`);
  } else {
    console.log(`Today's log file already exists: ${today}.log`);
  }
  
  // Create errors.log if it doesn't exist
  const errorsLogFile = path.join(logsDir, 'errors.log');
  
  if (!fs.existsSync(errorsLogFile)) {
    const timestamp = new Date().toISOString();
    fs.writeFileSync(errorsLogFile, `[${timestamp}] [SYSTEM][INFO] Error log file created\n`);
    console.log('Created errors.log file');
  } else {
    console.log('Errors log file already exists');
  }
};

// Main function
const main = async () => {
  try {
    console.log('=== DevCast Log Cleanup ===');
    
    // Clean up old log files
    cleanupOldLogs();
    
    // Find and delete request logs
    findAndDeleteRequestLogs();
    
    // Ensure logs directory structure
    ensureLogDirectory();
    
    console.log('\nLog cleanup completed successfully!');
    console.log('All logs will now be written to:');
    console.log('- Daily logs: logs/YYYY-MM-DD.log');
    console.log('- Error logs: logs/errors.log');
  } catch (error) {
    console.error('Error during log cleanup:', error);
    process.exit(1);
  }
};

// Run the script
main(); 