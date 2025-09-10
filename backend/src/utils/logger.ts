/**
 * Logger utility for structured logging
 */

import winston from 'winston';

/**
 * Logger class for structured logging throughout the application
 */
export class Logger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            service,
            message,
            ...meta,
          });
        })
      ),
      defaultMeta: { service },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: process.env.LOG_FILE || 'logs/app.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  /**
   * Log info message
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log debug message
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log with custom level
   */
  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta);
  }
}
