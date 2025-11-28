import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * 增强的加载指示器组件
 * 支持多阶段进度、预估时间、可取消操作
 */
const LoadingIndicator = ({
  isLoading = false,
  message = '加载中...',
  progress = null, // 0-100
  stages = [],
  currentStage = 0,
  estimatedTime = null,
  onCancel = null,
  size = 'md',
  overlay = false,
  className = ''
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, startTime]);

  if (!isLoading) return null;

  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const content = (
    <div className={clsx(
      'bg-white rounded-lg shadow-lg p-6 max-w-md w-full',
      className
    )}>
      {/* 加载图标 */}
      <div className="flex items-center justify-center mb-4">
        <Loader2 className={clsx(sizes[size], 'animate-spin text-blue-600')} />
      </div>

      {/* 主消息 */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          {message}
        </h3>
        {estimatedTime && (
          <p className="text-sm text-gray-500">
            预计还需 {formatTime(Math.max(0, estimatedTime - elapsedTime))}
          </p>
        )}
      </div>

      {/* 进度条 */}
      {progress !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>进度</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* 阶段指示器 */}
      {stages.length > 0 && (
        <div className="mb-4 space-y-2">
          {stages.map((stage, index) => {
            const isCompleted = index < currentStage;
            const isCurrent = index === currentStage;
            const isPending = index > currentStage;

            return (
              <div
                key={stage.key || index}
                className={clsx(
                  'flex items-center gap-3 p-2 rounded-lg transition-colors',
                  isCurrent && 'bg-blue-50',
                  isCompleted && 'opacity-60'
                )}
              >
                {/* 状态图标 */}
                <div className={clsx(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                  isCompleted && 'bg-green-500 text-white',
                  isCurrent && 'bg-blue-600 text-white',
                  isPending && 'bg-gray-200 text-gray-500'
                )}>
                  {isCompleted ? '✓' : index + 1}
                </div>

                {/* 阶段信息 */}
                <div className="flex-1 min-w-0">
                  <div className={clsx(
                    'text-sm font-medium truncate',
                    isCurrent && 'text-blue-900',
                    isCompleted && 'text-gray-600',
                    isPending && 'text-gray-500'
                  )}>
                    {stage.label}
                  </div>
                  {isCurrent && stage.duration && (
                    <div className="text-xs text-gray-500">
                      约需 {stage.duration} 秒
                    </div>
                  )}
                </div>

                {/* 当前阶段的加载动画 */}
                {isCurrent && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 已用时间 */}
      {elapsedTime > 0 && (
        <div className="text-center text-xs text-gray-500 mb-3">
          已用时：{formatTime(elapsedTime)}
        </div>
      )}

      {/* 取消按钮 */}
      {onCancel && (
        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          取消操作
        </button>
      )}
    </div>
  );

  // 覆盖层模式
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * 简单的加载旋转器
 */
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <Loader2 
      className={clsx(
        sizes[size], 
        'animate-spin text-current',
        className
      )} 
    />
  );
};

/**
 * 内联加载状态
 */
export const InlineLoader = ({ text = '加载中...', className = '' }) => (
  <div className={clsx('flex items-center gap-2 text-gray-600', className)}>
    <Spinner size="sm" />
    <span className="text-sm">{text}</span>
  </div>
);

/**
 * 按钮加载状态
 */
export const ButtonLoader = () => (
  <Spinner size="sm" className="text-current" />
);

export default LoadingIndicator;

