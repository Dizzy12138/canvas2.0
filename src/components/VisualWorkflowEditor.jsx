import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import { 
  Play, 
  Settings, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  Upload, 
  Download,
  Zap,
  Layers,
  GitBranch,
  FileText
} from 'lucide-react';

const VisualWorkflowEditor = ({ 
  workflowData,
  onParameterChange,
  onSaveWorkflow,
  onLoadWorkflow,
  className 
}) => {
  const [parameters, setParameters] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState('parameters');
  const [isEditing, setIsEditing] = useState(false);

  // 初始化参数值
  useEffect(() => {
    if (workflowData && workflowData.data && workflowData.data.parameters) {
      const initialParams = {};
      Object.keys(workflowData.data.parameters).forEach(key => {
        initialParams[key] = workflowData.data.parameters[key].default;
      });
      setParameters(initialParams);
    } else {
      setParameters({});
    }
  }, [workflowData]);

  // 处理参数变化
  const handleParamChange = (key, value) => {
    const newParams = { ...parameters, [key]: value };
    setParameters(newParams);
    onParameterChange?.(newParams);
  };

  // 检查参数是否应该显示（基于条件）
  const shouldShowParameter = (param) => {
    if (!param.condition) return true;
    
    const { param: conditionParam, value: conditionValue, operator = "==" } = param.condition;
    const currentValue = parameters[conditionParam];
    
    switch (operator) {
      case "==":
        return currentValue === conditionValue;
      case "!=":
        return currentValue !== conditionValue;
      case ">":
        return currentValue > conditionValue;
      case "<":
        return currentValue < conditionValue;
      case ">=":
        return currentValue >= conditionValue;
      case "<=":
        return currentValue <= conditionValue;
      case "in":
        return Array.isArray(conditionValue) && conditionValue.includes(currentValue);
      case "not_in":
        return Array.isArray(conditionValue) && !conditionValue.includes(currentValue);
      default:
        return true;
    }
  };

  // 渲染参数控件
  const renderParameterControl = (key, param) => {
    const value = parameters[key] !== undefined ? parameters[key] : param.default;
    
    switch (param.type) {
      case 'number':
      case 'integer':
        if (param.min !== undefined && param.max !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{param.label || key}</span>
                <span>{value}</span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step || (param.type === 'integer' ? 1 : 0.1)}
                value={value}
                onChange={(e) => handleParamChange(key, param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>{param.min}</span>
                <span>{param.max}</span>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">{param.label || key}</label>
              <input
                type="number"
                step={param.step || (param.type === 'integer' ? 1 : 0.1)}
                value={value}
                onChange={(e) => handleParamChange(key, param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          );
        }
      
      case 'string':
        if (param.options && Array.isArray(param.options)) {
          return (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">{param.label || key}</label>
              <select
                value={value}
                onChange={(e) => handleParamChange(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {param.options.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        } else {
          return (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">{param.label || key}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => handleParamChange(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          );
        }
      
      case 'boolean':
        return (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">{param.label || key}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleParamChange(key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        );
      
      default:
        return (
          <div className="space-y-1">
            <label className="text-xs text-gray-600">{param.label || key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        );
    }
  };

  // 如果没有工作流数据，显示空状态
  if (!workflowData) {
    return (
      <div className={clsx('panel p-6 flex flex-col items-center justify-center', className)}>
        <FileText size={48} className="text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">未选择工作流</h3>
        <p className="text-sm text-gray-500 text-center mb-4">
          请在AI生成面板中选择一个工作流，或上传自定义工作流文件
        </p>
        <button
          onClick={onLoadWorkflow}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Upload size={16} />
          <span>上传工作流</span>
        </button>
      </div>
    );
  }

  const params = workflowData.data?.parameters || {};

  return (
    <div className={clsx('panel flex flex-col', className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">{workflowData.name || '工作流参数'}</h3>
            <p className="text-xs text-gray-500 mt-1">{workflowData.description || '调整工作流参数'}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title={showPreview ? '隐藏预览' : '显示预览'}
            >
              {showPreview ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button
              onClick={onSaveWorkflow}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              title="保存工作流"
            >
              <Save size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 px-4 py-3 text-xs font-medium flex items-center justify-center space-x-1 ${
            activeTab === 'parameters' 
              ? 'text-primary-600 border-b-2 border-primary-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('parameters')}
        >
          <Settings size={14} />
          <span>参数设置</span>
        </button>
        <button
          className={`flex-1 px-4 py-3 text-xs font-medium flex items-center justify-center space-x-1 ${
            activeTab === 'preview' 
              ? 'text-primary-600 border-b-2 border-primary-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={14} />
          <span>预览</span>
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'parameters' ? (
          // 参数设置面板
          <div className="h-full overflow-y-auto p-4">
            {Object.keys(params).length > 0 ? (
              <div className="space-y-4">
                {Object.keys(params).map(key => {
                  const param = params[key];
                  
                  // 条件渲染
                  if (!shouldShowParameter(param)) {
                    return null;
                  }
                  
                  return (
                    <div 
                      key={key} 
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      {param.description && (
                        <div className="mb-2">
                          <div className="flex items-start">
                            <span className="text-xs font-medium text-gray-900 flex-1">
                              {param.label || key}
                            </span>
                            <span className="text-xs text-gray-400 ml-2" title={param.description}>
                              (?)
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                        </div>
                      )}
                      {renderParameterControl(key, param)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Settings size={32} className="text-gray-300 mb-3" />
                <h4 className="text-sm font-medium text-gray-900 mb-1">无参数</h4>
                <p className="text-xs text-gray-500">
                  当前工作流未定义可编辑参数
                </p>
              </div>
            )}
          </div>
        ) : (
          // 预览面板
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-900 mb-2">工作流信息</h4>
                <div className="space-y-2 text-xs text-blue-800">
                  <div className="flex justify-between">
                    <span>名称:</span>
                    <span className="font-medium">{workflowData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>类型:</span>
                    <span className="font-medium">
                      {workflowData.type === 'builtin' ? '内置' : '自定义'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>最后修改:</span>
                    <span className="font-medium">{workflowData.lastModified}</span>
                  </div>
                </div>
              </div>

              {Object.keys(parameters).length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">当前参数值</h4>
                  <div className="space-y-2 text-xs">
                    {Object.keys(parameters).map(key => {
                      const param = params[key];
                      if (!param || !shouldShowParameter(param)) return null;
                      
                      return (
                        <div key={key} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                          <span className="text-gray-600">{param.label || key}:</span>
                          <span className="font-medium text-gray-900">
                            {typeof parameters[key] === 'boolean' 
                              ? parameters[key] ? '是' : '否' 
                              : parameters[key]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="text-sm font-medium text-green-900 mb-2">使用说明</h4>
                <ul className="text-xs text-green-800 space-y-1">
                  <li>• 调整左侧参数设置实时生效</li>
                  <li>• 参数值将应用于AI生成过程</li>
                  <li>• 条件参数会根据依赖关系自动显示/隐藏</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-gray-200 flex justify-between">
        <button
          onClick={onLoadWorkflow}
          className="flex items-center space-x-1 px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Upload size={14} />
          <span>上传</span>
        </button>
        <button
          onClick={onSaveWorkflow}
          className="flex items-center space-x-1 px-3 py-2 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Save size={14} />
          <span>保存</span>
        </button>
      </div>
    </div>
  );
};

export default VisualWorkflowEditor;