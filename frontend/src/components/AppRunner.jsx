import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExecutionHistory from '@frontend/components/ExecutionHistory';

const AppRunner = ({ appId }) => {
  const [formData, setFormData] = useState({});
  const [appConfig, setAppConfig] = useState(null);
  const [pageDSL, setPageDSL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState({});
  const [executionLog, setExecutionLog] = useState([]);
  const [sseConnection, setSseConnection] = useState(null);

  // 加载页面DSL和应用配置以构建表单
  useEffect(() => {
    if (appId) {
      loadPageDSL();
      loadAppConfig();
    }
    
    // 清理SSE连接
    return () => {
      if (sseConnection) {
        sseConnection.close();
      }
    };
  }, [appId]);

  const loadAppConfig = async () => {
    try {
      const response = await axios.get(`/api/apps/${appId}`);
      setAppConfig(response.data);
    } catch (error) {
      console.log('加载应用配置失败');
    }
  };

  const loadPageDSL = async () => {
    try {
      const response = await axios.get(`/api/apps/${appId}/page`);
      setPageDSL(response.data);
    } catch (error) {
      console.error('加载页面配置失败', error);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (paramKey, value) => {
    setFormData(prev => ({ ...prev, [paramKey]: value }));
  };

  // 处理文件上传
  const handleFileUpload = async (e, paramKey) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [paramKey]: true }));
    
    try {
      // 这里应该上传文件到对象存储并返回URL
      // 为简化示例，我们直接使用文件名作为"URL"
      const fileUrl = `file://${file.name}`;
      
      // 更新表单值
      setFormData(prev => ({ ...prev, [paramKey]: fileUrl }));
    } catch (error) {
      console.error('文件上传失败', error);
    } finally {
      setUploading(prev => ({ ...prev, [paramKey]: false }));
    }
  };

  // 渲染表单组件
  const renderComponent = (component) => {
    const { type, title, paramKey, defaultValue, props = {}, biz = false } = component;
    
    // 检查是否为商业版功能
    if (biz) {
      return (
        <div key={paramKey} className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
              {title}
            </label>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              商业版
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            此功能需要商业版权限才能使用
          </p>
        </div>
      );
    }
    
    switch (type) {
      case 'upload_image':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <div className="flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, paramKey)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
              {uploading[paramKey] && (
                <div className="ml-3">
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            {formData[paramKey] && (
              <p className="mt-1 text-sm text-gray-500">已上传: {formData[paramKey]}</p>
            )}
          </div>
        );
        
      case 'text_input':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <input
              type="text"
              value={formData[paramKey] || defaultValue || ''}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              placeholder={props.placeholder || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
        
      case 'textarea':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <textarea
              value={formData[paramKey] || defaultValue || ''}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              placeholder={props.placeholder || ''}
              rows={props.rows || 3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
        
      case 'select':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <select
              value={formData[paramKey] || defaultValue || ''}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">请选择</option>
              {props.options && props.options.map((option, index) => {
                // 支持两种格式：纯字符串或"值:标签"格式
                const parts = option.split(':');
                const value = parts[0];
                const label = parts.length > 1 ? parts[1] : value;
                return (
                  <option key={index} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        );
        
      case 'slider':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <input
              type="range"
              min={props.min || 0}
              max={props.max || 100}
              value={formData[paramKey] !== undefined ? formData[paramKey] : (defaultValue !== undefined ? defaultValue : props.min || 0)}
              onChange={(e) => handleInputChange(paramKey, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center text-sm text-gray-500 mt-1">
              当前值: {formData[paramKey] !== undefined ? formData[paramKey] : (defaultValue !== undefined ? defaultValue : props.min || 0)}
            </div>
          </div>
        );
        
      case 'checkbox':
        return (
          <div key={paramKey} className="mb-4 flex items-center">
            <input
              id={paramKey}
              type="checkbox"
              checked={formData[paramKey] || defaultValue || false}
              onChange={(e) => handleInputChange(paramKey, e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={paramKey} className="ml-2 block text-sm text-gray-700">
              {title}
            </label>
          </div>
        );
        
      case 'number_input':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <input
              type="number"
              value={formData[paramKey] || defaultValue || ''}
              onChange={(e) => handleInputChange(paramKey, parseFloat(e.target.value))}
              placeholder={props.placeholder || ''}
              min={props.min}
              max={props.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
        
      case 'color_picker':
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <input
              type="color"
              value={formData[paramKey] || defaultValue || '#000000'}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
        
      default:
        return (
          <div key={paramKey} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {title}
            </label>
            <input
              type="text"
              value={formData[paramKey] || defaultValue || ''}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              placeholder="请输入内容"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
    }
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setExecutionLog([]);
    
    try {
      // 创建SSE连接以获取实时日志
      const eventSource = new EventSource(`/api/apps/${appId}/run-stream?params=${encodeURIComponent(JSON.stringify(formData))}`);
      setSseConnection(eventSource);
      
      // 监听日志事件
      eventSource.addEventListener('log', (event) => {
        const logEntry = JSON.parse(event.data);
        setExecutionLog(prev => [...prev, logEntry.message]);
      });
      
      // 监听结果事件
      eventSource.addEventListener('result', (event) => {
        const resultData = JSON.parse(event.data);
        setResult(resultData);
        eventSource.close();
        setLoading(false);
      });
      
      // 监听错误事件
      eventSource.addEventListener('error', (event) => {
        const errorData = JSON.parse(event.data);
        const errorMsg = errorData.message || '处理失败';
        alert(errorMsg);
        eventSource.close();
        setLoading(false);
      });
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || '处理失败';
      alert(errorMsg);
      setLoading(false);
    }
  };

  // 渲染结果
  const renderResult = () => {
    if (!result) return null;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">处理结果</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="text-sm bg-green-50 p-3 rounded border border-green-200">
            <div className="font-medium text-green-800">请求ID</div>
            <div className="text-green-600">{result.requestId}</div>
          </div>
          <div className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
            <div className="font-medium text-blue-800">处理耗时</div>
            <div className="text-blue-600">{result.durationMs}ms</div>
          </div>
        </div>
        
        {executionLog.length > 0 && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">执行日志</h4>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-40 overflow-y-auto">
              {executionLog.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        )}
        
        {result.outputs?.primary && (
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">主产出</h4>
            {result.outputs.primary.type === 'image' && (
              <div className="flex justify-center">
                <img
                  src={result.outputs.primary.url}
                  alt="处理结果"
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
              </div>
            )}
            {result.outputs.primary.type === 'text' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">{result.outputs.primary.content}</p>
              </div>
            )}
          </div>
        )}
        
        {result.outputs?.others && result.outputs.others.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">其他产出</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.outputs.others.map((output, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  {output.type === 'image' && (
                    <img
                      src={output.url}
                      alt={`产出 ${index + 1}`}
                      className="max-w-full h-auto rounded"
                    />
                  )}
                  {output.type === 'text' && (
                    <p className="text-gray-700">{output.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!pageDSL) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-3 text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        {appConfig?.name || pageDSL?.appName || '应用运行'}
      </h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">参数配置</h4>
            <form onSubmit={handleSubmit}>
              {pageDSL.components && pageDSL.components.map(component => 
                renderComponent(component)
              )}
              
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </>
                  ) : (
                    '开始处理'
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* 执行历史 */}
          <div className="mt-6">
            <ExecutionHistory appId={appId} />
          </div>
        </div>
        
        <div>
          {result ? (
            renderResult()
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">结果预览</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {loading ? '处理中...' : '提交表单后将在此处显示结果'}
                </p>
                
                {/* 实时日志显示 */}
                {loading && executionLog.length > 0 && (
                  <div className="mt-4 text-left">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">执行日志</h4>
                    <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs max-h-32 overflow-y-auto">
                      {executionLog.map((log, index) => (
                        <div key={index}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppRunner;