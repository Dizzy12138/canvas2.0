import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ExecutionHistory from '@frontend/components/ExecutionHistory';

const LOG_LIMIT = 100;

const TYPE_DEFAULTS = {
  upload_image: '',
  text_input: '',
  textarea: '',
  select: '',
  slider: 0,
  checkbox: false,
  number_input: 0,
  color_picker: '#000000',
  toggle: false,
  json_editor: '{}',
  image_preview_select: '',
  tag_group_single: '',
  tag_group_multi: []
};

const getDefaultValueForType = (type) => {
  if (!type) return '';
  const value = TYPE_DEFAULTS[type];
  if (Array.isArray(value)) {
    return [...value];
  }
  if (value && typeof value === 'object') {
    return { ...value };
  }
  return value !== undefined ? value : '';
};

const AppRunner = ({ appId }) => {
  const [formData, setFormData] = useState({});
  const [appConfig, setAppConfig] = useState(null);
  const [pageDSL, setPageDSL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState({});
  const [executionLog, setExecutionLog] = useState([]);
  const [sseConnection, setSseConnection] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

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

  useEffect(() => {
    if (!pageDSL?.components) {
      return;
    }
    setFormData(prev => {
      const next = { ...prev };
      for (const component of pageDSL.components) {
        const key = component.paramKey;
        if (key && next[key] === undefined) {
          const fallback = getDefaultValueForType(component.type);
          if (component.defaultValue !== undefined) {
            next[key] = Array.isArray(component.defaultValue)
              ? [...component.defaultValue]
              : component.defaultValue;
          } else {
            next[key] = fallback;
          }
        }
      }
      return next;
    });
  }, [pageDSL]);

  const requiredKeys = useMemo(() => {
    if (!pageDSL?.components) return [];
    return pageDSL.components.filter(component => component.required).map(component => component.paramKey);
  }, [pageDSL]);

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
      setValidationErrors([]);
    } catch (error) {
      console.error('加载页面配置失败', error);
    }
  };

  // 处理表单输入变化
  const handleInputChange = (paramKey, value) => {
    setFormData(prev => ({ ...prev, [paramKey]: value }));
    setValidationErrors(prev => prev.filter(key => key !== paramKey));
  };

  const validateForm = () => {
    if (!requiredKeys.length) return true;
    const missing = requiredKeys.filter((key) => {
      const value = formData[key];
      if (value === undefined || value === null) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
    setValidationErrors(missing);
    return missing.length === 0;
  };

  // 处理文件上传
  const handleFileUpload = async (event, paramKey) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(prev => ({
      ...prev,
      [paramKey]: { active: true, progress: 0, name: file.name }
    }));

    try {
      const payload = new FormData();
      payload.append('file', file);

      const response = await axios.post('/api/uploads', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          setUploading(prev => ({
            ...prev,
            [paramKey]: { active: true, progress: percentage, name: file.name }
          }));
        }
      });

      const fileUrl = response?.data?.data?.url;
      if (fileUrl) {
        setFormData(prev => ({ ...prev, [paramKey]: fileUrl }));
      }
    } catch (error) {
      console.error('文件上传失败', error);
      const message = error?.response?.data?.error?.message || '文件上传失败';
      alert(message);
    } finally {
      setUploading(prev => ({
        ...prev,
        [paramKey]: { active: false, progress: 100, name: file.name }
      }));
    }
  };

  // 渲染表单组件
  const renderComponent = (component) => {
    const { type, title, paramKey, defaultValue, props = {}, biz = false, helpText } = component;

    if (!paramKey) {
      return null;
    }

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

    const value = formData[paramKey] !== undefined ? formData[paramKey] : (defaultValue !== undefined ? defaultValue : getDefaultValueForType(type));
    const error = validationErrors.includes(paramKey);
    const uploadState = uploading[paramKey];

    const labelNode = (
      <div className="flex items-start justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {title || component.friendlyName || paramKey}
          </label>
          {helpText && (
            <p className="mt-1 text-xs text-gray-500">{helpText}</p>
          )}
        </div>
        {error && <span className="text-xs text-red-500">必填</span>}
      </div>
    );

    switch (type) {
      case 'upload_image':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
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
              {uploadState?.active && (
                <div className="ml-3 text-sm text-gray-600">{uploadState.progress}%</div>
              )}
            </div>
            {value && (
              <p className="mt-1 text-sm text-gray-500 break-all">已上传: {value}</p>
            )}
          </div>
        );

      case 'text_input':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              placeholder={props.placeholder || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <textarea
              value={value || ''}
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
            {labelNode}
            <select
              value={value || ''}
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
            {labelNode}
            <input
              type="range"
              min={props.min || 0}
              max={props.max || 100}
              value={value !== undefined ? value : props.min || 0}
              onChange={(e) => handleInputChange(paramKey, parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="text-center text-sm text-gray-500 mt-1">
              当前值: {value !== undefined ? value : props.min || 0}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <div key={paramKey} className="mb-4 flex items-center">
            <input
              id={paramKey}
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleInputChange(paramKey, e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor={paramKey} className="ml-2 block text-sm text-gray-700">
              {title || component.friendlyName || paramKey}
            </label>
          </div>
        );

      case 'toggle':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <button
              type="button"
              onClick={() => handleInputChange(paramKey, !value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${value ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        );

      case 'number_input':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <input
              type="number"
              value={value ?? ''}
              onChange={(e) => {
                const nextValue = e.target.value === '' ? '' : Number(e.target.value);
                handleInputChange(paramKey, nextValue);
              }}
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
            {labelNode}
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'json_editor':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2)}
              onChange={(e) => handleInputChange(paramKey, e.target.value)}
              rows={props.rows || 6}
              className="w-full font-mono px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );

      case 'image_preview_select':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <div className="grid grid-cols-2 gap-3">
              {(props.options || []).map((option, index) => {
                const normalized = typeof option === 'string'
                  ? { value: option, label: option, preview: option }
                  : option;
                const selected = value === normalized.value;
                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => handleInputChange(paramKey, normalized.value)}
                    className={`border rounded-md overflow-hidden focus:outline-none ${selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
                  >
                    {normalized.preview && (
                      <img src={normalized.preview} alt={normalized.label} className="w-full h-24 object-cover" />
                    )}
                    <div className="p-2 text-sm text-gray-700">{normalized.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'tag_group_single':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <div className="flex flex-wrap gap-2">
              {(props.options || []).map((option, index) => {
                const normalized = typeof option === 'string'
                  ? { value: option, label: option }
                  : option;
                const selected = value === normalized.value;
                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => handleInputChange(paramKey, normalized.value)}
                    className={`px-3 py-1 rounded-full border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}
                  >
                    {normalized.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'tag_group_multi':
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <div className="flex flex-wrap gap-2">
              {(props.options || []).map((option, index) => {
                const normalized = typeof option === 'string'
                  ? { value: option, label: option }
                  : option;
                const selectedValues = Array.isArray(value) ? value : [];
                const selected = selectedValues.includes(normalized.value);
                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => {
                      const current = Array.isArray(selectedValues) ? [...selectedValues] : [];
                      if (selected) {
                        handleInputChange(paramKey, current.filter(item => item !== normalized.value));
                      } else {
                        handleInputChange(paramKey, [...current, normalized.value]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full border ${selected ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'}`}
                  >
                    {normalized.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return (
          <div key={paramKey} className="mb-4">
            {labelNode}
            <input
              type="text"
              value={value || ''}
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
    if (!validateForm()) {
      alert('请填写所有必填参数');
      return;
    }
    setLoading(true);
    setResult(null);
    setExecutionLog([]);
    setShowLogs(false);
    
    let eventSource;
    try {
      // 创建SSE连接以获取实时日志
      eventSource = new EventSource(`/api/apps/${appId}/run-stream?params=${encodeURIComponent(JSON.stringify(formData))}`);
      setSseConnection(eventSource);

      await new Promise((resolve, reject) => {
        let settled = false;

        const markSettled = (action) => {
          if (!settled) {
            settled = true;
            action();
          }
        };

        // 监听日志事件
        eventSource.addEventListener('log', (event) => {
          try {
            const logEntry = JSON.parse(event.data);
            setExecutionLog(prev => {
              const next = [...prev, logEntry.message].slice(-LOG_LIMIT);
              return next;
            });
          } catch (parseError) {
            if (event?.data) {
              setExecutionLog(prev => {
                const next = [...prev, event.data].slice(-LOG_LIMIT);
                return next;
              });
            }
          }
          setShowLogs(prev => (prev ? prev : true));
        });

        // 监听结果事件
        eventSource.addEventListener('result', (event) => {
          markSettled(() => {
            try {
              const resultData = JSON.parse(event.data);
              setResult(resultData);
              resolve();
            } catch (parseError) {
              reject(parseError);
            }
          });
        });

        // 监听错误事件
        eventSource.addEventListener('error', (event) => {
          markSettled(() => {
            let errorMsg = '处理失败';

            if (event?.data) {
              try {
                const errorData = JSON.parse(event.data);
                errorMsg = errorData.message || errorMsg;
              } catch (parseError) {
                errorMsg = event.data || errorMsg;
              }
            }

            reject(new Error(errorMsg));
          });
        });
      });
    } catch (error) {
      const fallbackMsg = error?.response?.data?.error?.message || error?.message || '处理失败';
      alert(fallbackMsg);
    } finally {
      if (eventSource) {
        eventSource.close();
      }
      setSseConnection(null);
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
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-md font-medium text-gray-900">执行日志</h4>
              <button
                type="button"
                onClick={() => setShowLogs(prev => !prev)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showLogs ? '收起' : '展开'}
              </button>
            </div>
            {showLogs && (
              <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-40 overflow-y-auto">
                {executionLog.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
            )}
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">执行日志</h4>
                      <button
                        type="button"
                        onClick={() => setShowLogs(prev => !prev)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        {showLogs ? '收起' : '展开'}
                      </button>
                    </div>
                    {showLogs && (
                      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-xs max-h-32 overflow-y-auto">
                        {executionLog.map((log, index) => (
                          <div key={index}>{log}</div>
                        ))}
                      </div>
                    )}
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