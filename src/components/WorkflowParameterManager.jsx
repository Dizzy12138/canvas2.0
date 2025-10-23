import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WorkflowParameterManager = ({ workflowData, onParametersChange }) => {
  const [parameters, setParameters] = useState({});
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(false);

  // 初始化参数
  useEffect(() => {
    if (workflowData && workflowData.parameters) {
      const initialParams = {};
      Object.keys(workflowData.parameters).forEach(key => {
        initialParams[key] = workflowData.parameters[key].default;
      });
      setParameters(initialParams);
    }
  }, [workflowData]); // 只有当workflowData变化时才重新初始化

  // 当参数变化时通知父组件
  useEffect(() => {
    onParametersChange?.(parameters);
  }, [parameters, onParametersChange]); // 添加正确的依赖数组

  // 获取可用模型
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        // 这里应该调用获取模型的API
        // 暂时返回模拟数据
        const models = [
          { id: 'sd15', name: 'Stable Diffusion 1.5' },
          { id: 'sd21', name: 'Stable Diffusion 2.1' },
          { id: 'anime', name: 'Anime Style Model' },
          { id: 'realistic', name: 'Realistic Model' }
        ];
        setAvailableModels(models);
      } catch (error) {
        console.error('获取模型列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  // 处理参数变化
  const handleParamChange = (key, value) => {
    setParameters(prev => ({ ...prev, [key]: value }));
  };

  // 渲染参数输入控件
  const renderParameterInput = (key, param) => {
    switch (param.type) {
      case 'string':
        if (param.enum) {
          return (
            <select
              value={parameters[key] || param.default}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {param.enum.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="text"
            value={parameters[key] || param.default}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
      
      case 'number':
        if (param.enum) {
          return (
            <select
              value={parameters[key] || param.default}
              onChange={(e) => handleParamChange(key, Number(e.target.value))}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {param.enum.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        }
        return (
          <input
            type="number"
            min={param.min}
            max={param.max}
            step={param.step || 1}
            value={parameters[key] || param.default}
            onChange={(e) => handleParamChange(key, Number(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
      
      case 'boolean':
        return (
          <div className="mt-1">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={parameters[key] || param.default}
                onChange={(e) => handleParamChange(key, e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <span className="ml-2 text-gray-700">{param.description}</span>
            </label>
          </div>
        );
      
      default:
        return (
          <input
            type="text"
            value={parameters[key] || param.default}
            onChange={(e) => handleParamChange(key, e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        );
    }
  };

  if (!workflowData || !workflowData.parameters) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">该工作流没有可配置的参数</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">工作流参数配置</h3>
        <p className="text-sm text-gray-500 mb-6">
          配置工作流参数，这些参数将在生成时使用
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Object.keys(workflowData.parameters).map(key => {
          const param = workflowData.parameters[key];
          return (
            <div key={key} className="bg-gray-50 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700">
                {param.title || key}
                {param.required && <span className="text-red-500">*</span>}
              </label>
              {param.description && (
                <p className="text-xs text-gray-500 mt-1">{param.description}</p>
              )}
              {renderParameterInput(key, param)}
            </div>
          );
        })}
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-800 mb-2">参数说明</h4>
        <ul className="text-xs text-blue-700 list-disc pl-5 space-y-1">
          <li>这些参数将应用于工作流中的相应节点</li>
          <li>修改参数后会实时保存</li>
          <li>某些参数可能需要特定的模型支持</li>
        </ul>
      </div>
    </div>
  );
};

export default WorkflowParameterManager;