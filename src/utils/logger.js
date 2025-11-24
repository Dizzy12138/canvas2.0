/**
 * 统一日志工具
 * 提供统一的日志接口，便于后续替换为专业的日志库
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// 根据环境变量设置日志级别
const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL || 'INFO';
  return LOG_LEVELS[envLevel.toUpperCase()] ?? LOG_LEVELS.INFO;
};

const currentLogLevel = getLogLevel();

const shouldLog = (level) => level >= currentLogLevel;

/**
 * 日志工具类
 */
class Logger {
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  /**
   * 创建带前缀的日志消息
   */
  formatMessage(level, ...args) {
    const timestamp = new Date().toISOString();
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    return [`[${timestamp}] ${prefix}`, ...args];
  }

  /**
   * Debug级别日志
   */
  debug(...args) {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.debug(...this.formatMessage('DEBUG', ...args));
    }
  }

  /**
   * Info级别日志
   */
  info(...args) {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(...this.formatMessage('INFO', ...args));
    }
  }

  /**
   * Warn级别日志
   */
  warn(...args) {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(...this.formatMessage('WARN', ...args));
    }
  }

  /**
   * Error级别日志
   */
  error(...args) {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(...this.formatMessage('ERROR', ...args));
    }
  }

  /**
   * 创建子日志器（带子前缀）
   */
  createChild(prefix) {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    return new Logger(childPrefix);
  }
}

// 默认日志器
const defaultLogger = new Logger();

// 创建模块日志器
export const createLogger = (prefix) => new Logger(prefix);

// 导出默认日志方法
export const logger = {
  debug: (...args) => defaultLogger.debug(...args),
  info: (...args) => defaultLogger.info(...args),
  warn: (...args) => defaultLogger.warn(...args),
  error: (...args) => defaultLogger.error(...args),
};

export default logger;

