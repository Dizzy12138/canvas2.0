import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

/**
 * 全局错误边界组件
 * 捕获并优雅地处理应用崩溃
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // 发送错误到监控服务（如果配置了）
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }

    // 存储到 localStorage 用于调试
    try {
      const errorLog = {
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      const existingLogs = JSON.parse(localStorage.getItem('errorLogs') || '[]');
      existingLogs.push(errorLog);
      // 只保留最近 10 条
      const recentLogs = existingLogs.slice(-10);
      localStorage.setItem('errorLogs', JSON.stringify(recentLogs));
    } catch (e) {
      // 忽略 localStorage 错误
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorCount } = this.state;
      const isDevelopment = import.meta.env.MODE === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
          <div className="max-w-2xl w-full">
            {/* 主错误卡片 */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* 头部 */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-1">
                      哎呀，出错了！
                    </h1>
                    <p className="text-red-100">
                      我们遇到了一个意外错误，但别担心，您的数据是安全的
                    </p>
                  </div>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6 space-y-6">
                {/* 错误信息 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    错误详情：
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-900 font-mono">
                      {error?.message || '未知错误'}
                    </p>
                  </div>
                </div>

                {/* 建议操作 */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    您可以尝试：
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>刷新页面重新加载应用</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>返回首页继续使用其他功能</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>如果问题持续存在，请联系技术支持</span>
                    </div>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重试
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    刷新页面
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    <Home className="w-4 h-4" />
                  </button>
                </div>

                {/* 开发环境：显示详细堆栈 */}
                {isDevelopment && error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                      开发者信息（仅开发环境显示）
                    </summary>
                    <div className="mt-3 space-y-3">
                      {/* 错误堆栈 */}
                      <div>
                        <h4 className="text-xs font-medium text-gray-600 mb-1">
                          错误堆栈：
                        </h4>
                        <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                          {error.stack}
                        </pre>
                      </div>
                      
                      {/* 组件堆栈 */}
                      {errorInfo && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-600 mb-1">
                            组件堆栈：
                          </h4>
                          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto max-h-48">
                            {errorInfo.componentStack}
                          </pre>
                        </div>
                      )}

                      {/* 错误计数 */}
                      <div className="text-xs text-gray-500">
                        错误发生次数：{errorCount}
                      </div>
                    </div>
                  </details>
                )}

                {/* 支持信息 */}
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 text-center">
                    需要帮助？请访问{' '}
                    <a
                      href="/help"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      帮助中心
                    </a>
                    {' '}或联系{' '}
                    <a
                      href="mailto:support@example.com"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      技术支持
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* 额外提示 */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                错误 ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

