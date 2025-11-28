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

const normalizeLevel = (level) => LOG_LEVELS[level?.toUpperCase()] ?? null;

const getRuntimeLogLevel = () => {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLevel = params.get('logLevel');
    if (urlLevel) {
      const normalized = urlLevel.toUpperCase();
      window.localStorage?.setItem('app.logLevel', normalized);
      return normalizeLevel(normalized);
    }
    const stored = window.localStorage?.getItem('app.logLevel');
    if (stored) {
      return normalizeLevel(stored);
    }
  } catch (error) {
    // 访问 localStorage 失败时忽略，回退到默认逻辑
  }
  return null;
};

// 根据环境变量和运行时配置设置日志级别
const getLogLevel = () => {
  const runtimeLevel = getRuntimeLogLevel();
  if (runtimeLevel !== null) {
    return runtimeLevel;
  }
  const envLevel = normalizeLevel(import.meta.env.VITE_LOG_LEVEL);
  if (envLevel !== null) {
    return envLevel;
  }
  const fallback = import.meta.env.PROD ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;
  return fallback;
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

