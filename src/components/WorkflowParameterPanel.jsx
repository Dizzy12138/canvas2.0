import React, { useState, useEffect } from 'react';
import clsx from 'clsx';

const WorkflowParameterPanel = ({ 
  workflowData,
  onParameterChange,
  className 
}) => {
  const [parameters, setParameters] = useState({});

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

  // 渲染单个参数控件
  const renderParameterControl = (key, param) => {
    const value = parameters[key] !== undefined ? parameters[key] : param.default;
    
    switch (param.type) {
      case 'number':
      case 'integer':
        if (param.min !== undefined && param.max !== undefined) {
          return (
            <div className="space-y-1">
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step || (param.type === 'integer' ? 1 : 0.1)}
                value={value}
                onChange={(e) => handleParamChange(key, param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>{param.min}</span>
                <span>{value}</span>
                <span>{param.max}</span>
              </div>
            </div>
          );
        } else {
          return (
            <input
              type="number"
              step={param.step || (param.type === 'integer' ? 1 : 0.1)}
              value={value}
              onChange={(e) => handleParamChange(key, param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          );
        }
      
      case 'string':
        if (param.options && Array.isArray(param.options)) {
          return (
            <select
              value={value}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {param.options.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        } else {
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          );
        }
      
      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleParamChange(key, e.target.checked)}
              className="text-primary-500 rounded focus:ring-primary-500"
            />
            <span className="text-xs text-gray-700">
              {param.label || key}
            </span>
          </label>
        );
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        );
    }
  };

  // 如果没有工作流数据或参数，不显示面板
  if (!workflowData || !workflowData.data || !workflowData.data.parameters) {
    return null;
  }

  const params = workflowData.data.parameters;

  return (
    <div className={clsx('panel p-3 space-y-3', className)}>
      <h3 className="text-sm font-medium text-gray-900">工作流参数</h3>
      
      <div className="space-y-3">
        {Object.keys(params).map(key => {
          const param = params[key];
          
          // 条件渲染：根据其他参数的值决定是否显示当前参数
          if (!shouldShowParameter(param)) {
            return null;
          }
          
          return (
            <div key={key} className="space-y-1">
              <label className="text-xs text-gray-500 flex items-center">
                <span>{param.label || key}</span>
                {param.description && (
                  <span className="ml-1 text-gray-400" title={param.description}>
                    (?)
                  </span>
                )}
              </label>
              {renderParameterControl(key, param)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowParameterPanel;