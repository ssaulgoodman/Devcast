/**
 * Enhanced Logger Utility
 * 
 * Features:
 * - Consistent timestamp formatting
 * - Categorized log sources (TELEGRAM, GITHUB, CLAUDE, etc.)
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Multiple output targets (console, files)
 * - Specialized logging for AI interactions
 * 
 * Usage:
 * import logger from '../utils/logger';
 * logger.info('SYSTEM', 'Application started');
 * logger.telegram.info('Received message');
 * logger.ai.logInteraction('CLAUDE', userId, 'Generate content', 'Context data', 'Response', metrics);
 */

import * as fs from 'fs';
import * as path from 'path';

// Log levels enum
enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

// Log source type
type LogSource = string;

// Logger configuration interface
interface LoggerConfig {
    minLevel: LogLevel;
    logToConsole: boolean;
    logToFile: boolean;
    logDirectory: string;
    logAIFullResponses: boolean;
}

// AI metrics interface
interface AIMetrics {
    inputTokens: number;
    outputTokens: number;
    duration: number; // in milliseconds
}

// Default configuration
const defaultConfig: LoggerConfig = {
    minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
    logToConsole: true,
    logToFile: true,
    logDirectory: 'logs',
    logAIFullResponses: false
};

// Current configuration
let config: LoggerConfig = { ...defaultConfig };

// Ensure log directory exists
function ensureLogDirectory(): void {
    if (config.logToFile && !fs.existsSync(config.logDirectory)) {
        fs.mkdirSync(config.logDirectory, { recursive: true });
    }
}

// Format log message
function formatLogMessage(level: LogLevel, source: LogSource, message: string, args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    let formattedMessage = `[${source}][${levelName}] ${message}`;
    
    if (args.length > 0) {
        formattedMessage += ` ${args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : arg
        ).join(' ')}`;
    }
    
    return `${timestamp} ${formattedMessage}`;
}

// Write log to file
function writeToFile(filePath: string, message: string): void {
    ensureLogDirectory();
    try {
        fs.appendFileSync(filePath, message + '\n');
    } catch (error) {
        console.error(`Failed to write to log file: ${error}`);
    }
}

/**
 * Log a message with the specified level and source
 */
function log(level: LogLevel, source: LogSource, message: string, ...args: any[]): void {
    // Skip if below minimum level
    if (level < config.minLevel) {
        return;
    }

    const formattedMessage = formatLogMessage(level, source, message, args);
    
    // Log to console
    if (config.logToConsole) {
        if (level === LogLevel.ERROR) {
            console.error(formattedMessage);
        }
        else if (level === LogLevel.WARN) {
            console.warn(formattedMessage);
        }
        else {
            console.log(formattedMessage);
        }
    }
    
    // Log to file
    if (config.logToFile) {
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(config.logDirectory, `${date}.log`);
        writeToFile(logFile, formattedMessage);
        
        // Write to dedicated log file for errors
        if (level === LogLevel.ERROR) {
            const errorLogFile = path.join(config.logDirectory, 'errors.log');
            writeToFile(errorLogFile, formattedMessage);
        }
    }
}

/**
 * Log AI interaction with request/response details
 */
function logAIInteraction(
    source: LogSource, 
    userId: string, 
    requestSummary: string, 
    contextSummary: string, 
    response: string, 
    metrics: AIMetrics
): void {
    log(LogLevel.INFO, source, `Request for user ${userId}: ${requestSummary}`);
    log(LogLevel.DEBUG, source, `Context: ${contextSummary}`);
    
    // Truncate response for the main log
    const truncatedResponse = response.length > 100 ? response.substring(0, 100) + '...' : response;
    const metricsSummary = metrics ? `(${metrics.inputTokens}in/${metrics.outputTokens}out, ${metrics.duration}ms)` : '';
    
    log(LogLevel.INFO, source, `Response ${metricsSummary}: ${truncatedResponse}`);
    
    // Optionally log full response
    if (config.logAIFullResponses) {
        log(LogLevel.DEBUG, source, `Full response: ${response}`);
    }
}

// Public API
const logger = {
    // Configure logger
    configure: (newConfig: Partial<LoggerConfig>): void => {
        config = { ...config, ...newConfig };
    },
    
    // Generic logging
    debug: (source: LogSource, message: string, ...args: any[]): void => log(LogLevel.DEBUG, source, message, ...args),
    info: (source: LogSource, message: string, ...args: any[]): void => log(LogLevel.INFO, source, message, ...args),
    warn: (source: LogSource, message: string, ...args: any[]): void => log(LogLevel.WARN, source, message, ...args),
    error: (source: LogSource, message: string, ...args: any[]): void => log(LogLevel.ERROR, source, message, ...args),
    
    // Telegram-specific logging
    telegram: {
        debug: (message: string, ...args: any[]): void => log(LogLevel.DEBUG, 'TELEGRAM', message, ...args),
        info: (message: string, ...args: any[]): void => log(LogLevel.INFO, 'TELEGRAM', message, ...args),
        warn: (message: string, ...args: any[]): void => log(LogLevel.WARN, 'TELEGRAM', message, ...args),
        error: (message: string, ...args: any[]): void => log(LogLevel.ERROR, 'TELEGRAM', message, ...args),
    },
    
    // GitHub-specific logging
    github: {
        debug: (message: string, ...args: any[]): void => log(LogLevel.DEBUG, 'GITHUB', message, ...args),
        info: (message: string, ...args: any[]): void => log(LogLevel.INFO, 'GITHUB', message, ...args),
        warn: (message: string, ...args: any[]): void => log(LogLevel.WARN, 'GITHUB', message, ...args),
        error: (message: string, ...args: any[]): void => log(LogLevel.ERROR, 'GITHUB', message, ...args),
    },
    
    // AI interactions logging
    ai: {
        logInteraction: (
            provider: LogSource, 
            userId: string, 
            requestSummary: string, 
            contextSummary: string, 
            response: string, 
            metrics: AIMetrics
        ): void => logAIInteraction(provider, userId, requestSummary, contextSummary, response, metrics)
    }
};

export default logger; 