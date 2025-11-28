import React from 'react';
import clsx from 'clsx';

/**
 * 空状态组件
 * 提供友好的空状态展示和引导
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actions = [],
  tips = [],
  illustration = null,
  size = 'md',
  className = ''
}) => {
  const sizes = {
    sm: {
      icon: 'w-12 h-12',
      title: 'text-lg',
      description: 'text-sm',
      container: 'py-8'
    },
    md: {
      icon: 'w-16 h-16',
      title: 'text-xl',
      description: 'text-base',
      container: 'py-12'
    },
    lg: {
      icon: 'w-24 h-24',
      title: 'text-2xl',
      description: 'text-lg',
      container: 'py-16'
    }
  };

  const sizeConfig = sizes[size];

  return (
    <div className={clsx(
      'flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4',
      sizeConfig.container,
      className
    )}>
      {/* 插图或图标 */}
      {illustration ? (
        <div className="mb-6">
          {illustration}
        </div>
      ) : Icon && (
        <div className="mb-6">
          <Icon className={clsx(
            sizeConfig.icon,
            'text-gray-300 mx-auto'
          )} />
        </div>
      )}

      {/* 标题 */}
      {title && (
        <h3 className={clsx(
          'font-semibold text-gray-900 mb-2',
          sizeConfig.title
        )}>
          {title}
        </h3>
      )}

      {/* 描述 */}
      {description && (
        <p className={clsx(
          'text-gray-600 mb-6',
          sizeConfig.description
        )}>
          {description}
        </p>
      )}

      {/* 操作按钮 */}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className={clsx(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                action.primary ? [
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'focus:ring-blue-500'
                ] : action.variant === 'ghost' ? [
                  'text-gray-700 hover:bg-gray-100'
                ] : action.variant === 'link' ? [
                  'text-blue-600 hover:text-blue-700 hover:underline'
                ] : [
                  'bg-gray-100 text-gray-900 hover:bg-gray-200',
                  'focus:ring-gray-500'
                ]
              )}
            >
              {action.icon && <span className="w-4 h-4">{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* 提示信息 */}
      {tips.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 w-full max-w-md">
          <div className="text-sm text-gray-600 space-y-2">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5 flex-shrink-0">💡</span>
                <span className="text-left">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 预设的空状态组件
 */

// 无图层状态
export const NoLayersState = ({ onCreateLayer, onUploadImage }) => (
  <EmptyState
    title="还没有图层"
    description="创建第一个图层开始您的创作之旅"
    actions={[
      {
        label: '上传图片',
        onClick: onUploadImage,
        primary: true
      },
      {
        label: '新建图层',
        onClick: onCreateLayer
      }
    ]}
    tips={[
      '支持拖拽上传图片',
      '可以使用快捷键 Ctrl+V 粘贴图片',
      '支持 PNG、JPG、WebP 格式'
    ]}
  />
);

// 无搜索结果
export const NoSearchResultsState = ({ query, onClearSearch }) => (
  <EmptyState
    size="sm"
    title="未找到匹配结果"
    description={`没有找到与 "${query}" 相关的内容`}
    actions={[
      {
        label: '清除搜索',
        onClick: onClearSearch,
        primary: true
      }
    ]}
    tips={[
      '尝试使用不同的关键词',
      '检查拼写是否正确'
    ]}
  />
);

// 无数据状态
export const NoDataState = ({ title, description, onRefresh }) => (
  <EmptyState
    title={title || '暂无数据'}
    description={description || '目前还没有任何内容'}
    actions={onRefresh ? [
      {
        label: '刷新',
        onClick: onRefresh,
        primary: true
      }
    ] : []}
  />
);

// 加载失败状态
export const LoadErrorState = ({ onRetry }) => (
  <EmptyState
    title="加载失败"
    description="无法加载内容，请稍后重试"
    actions={[
      {
        label: '重试',
        onClick: onRetry,
        primary: true
      }
    ]}
  />
);

export default EmptyState;

