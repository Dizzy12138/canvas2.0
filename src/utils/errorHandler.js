/**
 * 统一错误处理工具
 */

import logger from './logger.js';

/**
 * 错误类型枚举
 */
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

/**
 * 错误处理类
 */
class ErrorHandler {
  /**
   * 处理错误并返回友好的错误消息
   */
  handleError(error, context = '') {
    const errorContext = context ? `[${context}]` : '';
    logger.error(`${errorContext} Error:`, error);

    // 根据错误类型返回不同的错误消息
    if (error.response) {
      // API错误
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      switch (status) {
        case 400:
          return `请求参数错误: ${message}`;
        case 401:
          return '未授权，请先登录';
        case 403:
          return '没有权限执行此操作';
        case 404:
          return '请求的资源不存在';
        case 500:
          return `服务器错误: ${message}`;
        default:
          return `请求失败 (${status}): ${message}`;
      }
    } else if (error.request) {
      // 网络错误
      return '网络连接失败，请检查网络设置';
    } else {
      // 其他错误
      return error.message || '发生未知错误';
    }
  }

  /**
   * 显示错误通知（可以替换为Toast组件）
   */
  showError(message, error = null) {
    // TODO: 替换为Toast通知组件
    if (error) {
      logger.error('Error notification:', error);
    }
    // 临时使用alert，后续替换为Toast
    alert(message);
  }

  /**
   * 显示成功通知
   */
  showSuccess(message) {
    // TODO: 替换为Toast通知组件
    logger.info('Success notification:', message);
    // 临时使用alert，后续替换为Toast
    // alert(message); // 成功消息通常不需要alert
  }

  /**
   * 显示警告通知
   */
  showWarning(message) {
    // TODO: 替换为Toast通知组件
    logger.warn('Warning notification:', message);
    alert(message);
  }
}

// 创建单例
const errorHandler = new ErrorHandler();

/**
 * 错误处理Hook（用于React组件）
 */
export const useErrorHandler = () => {
  return {
    handleError: (error, context) => errorHandler.handleError(error, context),
    showError: (message, error) => errorHandler.showError(message, error),
    showSuccess: (message) => errorHandler.showSuccess(message),
    showWarning: (message) => errorHandler.showWarning(message),
  };
};

export default errorHandler;

