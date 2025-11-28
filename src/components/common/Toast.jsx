import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * Toast 通知系统
 * 提供即时的操作反馈
 */

const ToastContext = createContext(null);

// Toast 类型配置
const toastTypes = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-900'
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-900'
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-900'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900'
  }
};

// Toast 组件
const ToastItem = ({ toast, onClose }) => {
  const { id, type, title, message, action, duration } = toast;
  const config = toastTypes[type] || toastTypes.info;
  const Icon = config.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md w-full',
        'animate-in slide-in-from-right duration-300',
        config.bgColor,
        config.borderColor
      )}
    >
      {/* 图标 */}
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', config.iconColor)} />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className={clsx('text-sm font-medium mb-1', config.textColor)}>
            {title}
          </div>
        )}
        {message && (
          <div className={clsx('text-sm', config.textColor, 'opacity-90')}>
            {message}
          </div>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={clsx(
              'mt-2 text-sm font-medium underline hover:no-underline',
              config.textColor
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={() => onClose(id)}
        className={clsx(
          'flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors',
          config.iconColor
        )}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Toast 容器
const ToastContainer = ({ toasts, onClose, position }) => {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
  };

  if (toasts.length === 0) return null;

  return (
    <div className={clsx('fixed z-50 flex flex-col gap-2', positions[position])}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Toast Provider
export const ToastProvider = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      type: 'info',
      duration: 3000,
      ...toast
    };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback({
    success: (title, options = {}) => 
      addToast({ type: 'success', title, ...options }),
    
    error: (title, options = {}) => 
      addToast({ type: 'error', title, ...options }),
    
    warning: (title, options = {}) => 
      addToast({ type: 'warning', title, ...options }),
    
    info: (title, options = {}) => 
      addToast({ type: 'info', title, ...options }),
    
    custom: (options) => 
      addToast(options)
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
        position={position}
      />
    </ToastContext.Provider>
  );
};

// Hook 使用 Toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// 独立的 Toast 函数（无需 Provider）
let toastQueue = [];
let toastId = 0;

export const toast = {
  success: (title, message) => {
    showToast('success', title, message);
  },
  error: (title, message) => {
    showToast('error', title, message);
  },
  warning: (title, message) => {
    showToast('warning', title, message);
  },
  info: (title, message) => {
    showToast('info', title, message);
  }
};

function showToast(type, title, message) {
  const id = ++toastId;
  
  // 创建 toast 元素
  const toastEl = document.createElement('div');
  toastEl.id = `toast-${id}`;
  toastEl.className = 'fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300';
  
  const config = toastTypes[type];
  const Icon = config.icon;
  
  toastEl.innerHTML = `
    <div class="flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md w-full ${config.bgColor} ${config.borderColor}">
      <svg class="w-5 h-5 flex-shrink-0 mt-0.5 ${config.iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${getIconPath(type)}
      </svg>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium ${config.textColor}">${title}</div>
        ${message ? `<div class="text-sm ${config.textColor} opacity-90 mt-1">${message}</div>` : ''}
      </div>
      <button onclick="this.closest('[id^=toast-]').remove()" class="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors ${config.iconColor}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(toastEl);
  
  // 自动移除
  setTimeout(() => {
    toastEl.style.animation = 'slide-out-to-right 300ms ease-out';
    setTimeout(() => toastEl.remove(), 300);
  }, 3000);
}

function getIconPath(type) {
  const paths = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
    error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>',
    warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
  };
  return paths[type] || paths.info;
}

export default toast;

