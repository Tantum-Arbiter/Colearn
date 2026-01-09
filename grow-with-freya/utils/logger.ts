/**
 * Centralized logging utility with log levels.
 * 
 * Log levels:
 * - debug: Verbose operational details (only in dev mode)
 * - info: Important state changes and events
 * - warn: Potential issues or unexpected but handled states
 * - error: Errors and failures
 * 
 * Usage:
 *   import { Logger } from '@/utils/logger';
 *   const log = Logger.create('MyComponent');
 *   log.debug('Detailed state:', data);
 *   log.info('User action completed');
 *   log.warn('Retrying operation');
 *   log.error('Failed to load', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  /** Minimum log level to output. Logs below this level are suppressed. */
  minLevel: LogLevel;
  /** Whether logging is enabled at all */
  enabled: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Determine if we're in development mode
const isDev = typeof __DEV__ !== 'undefined' 
  ? __DEV__ 
  : process.env.NODE_ENV === 'development';

const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Default config: show debug in dev, info+ in production, suppress in tests
const defaultConfig: LoggerConfig = {
  minLevel: isDev ? 'debug' : 'info',
  enabled: !isTest, // Disable logging in tests by default
};

let globalConfig: LoggerConfig = { ...defaultConfig };

export class Logger {
  private prefix: string;

  private constructor(namespace: string) {
    this.prefix = `[${namespace}]`;
  }

  /**
   * Create a logger instance for a specific namespace/component
   */
  static create(namespace: string): Logger {
    return new Logger(namespace);
  }

  /**
   * Configure global logging settings
   */
  static configure(config: Partial<LoggerConfig>): void {
    globalConfig = { ...globalConfig, ...config };
  }

  /**
   * Reset to default configuration
   */
  static reset(): void {
    globalConfig = { ...defaultConfig };
  }

  /**
   * Enable logging in tests (useful for debugging specific tests)
   */
  static enableInTests(): void {
    globalConfig.enabled = true;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!globalConfig.enabled) return false;
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[globalConfig.minLevel];
  }

  /**
   * Debug level - verbose operational details, only shown in dev mode
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.prefix, message, ...args);
    }
  }

  /**
   * Info level - important state changes and events
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(this.prefix, message, ...args);
    }
  }

  /**
   * Warn level - potential issues or unexpected but handled states
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.prefix, message, ...args);
    }
  }

  /**
   * Error level - errors and failures
   */
  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.prefix, message, ...args);
    }
  }
}

// Export a default instance for quick usage
export const log = Logger.create('App');

