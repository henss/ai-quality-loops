/**
 * Simple logger interface to allow users to override default logging.
 */
export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

/**
 * Default logger implementation using console.
 */
export const defaultLogger: Logger = {
  info: (msg, ...args) => console.info(msg, ...args),
  warn: (msg, ...args) => console.warn(msg, ...args),
  error: (msg, ...args) => console.error(msg, ...args),
  debug: (msg, ...args) => {
    if (process.env.DEBUG) {
      console.debug(msg, ...args);
    }
  },
};

/**
 * Silent logger implementation.
 */
export const silentLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

let currentLogger = defaultLogger;

/**
 * Get the current logger.
 */
export function getLogger(): Logger {
  return currentLogger;
}

/**
 * Set the current logger.
 */
export function setLogger(logger: Logger): void {
  currentLogger = logger;
}
