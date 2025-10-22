import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useTranslation from '@frontend/hooks/useTranslation';

const AppConfigForm = ({ workflowData, initialData, onNext, onBack }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic'); // 添加Tab状态
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    timeoutSec: initialData?.timeoutSec || 60,
    modelType: initialData?.modelType || 'SD',
    maxRuntime: initialData?.maxRuntime || 300,
    enableCache: initialData?.enableCache || false,
    errorHandling: initialData?.errorHandling || 'retry',
    resourcePriority: initialData?.resourcePriority || 'GPU',
    concurrencyLimit: initialData?.concurrencyLimit || 1,
    rateLimit: initialData?.rateLimit || 10
  });
  const [outputs, setOutputs] = useState(
    initialData?.outputs && initialData.outputs.length > 0 
      ? initialData.outputs.map((output, index) => ({
          key: index,
          nodeId: output.nodeId,
          port: output.port,
          type: output.type,
          isPrimary: output.isPrimary || false,
          // 添加参数映射
          parameterMappings: output.parameterMappings || []
        }))
      : [{ 
          key: Date.now(), 
          nodeId: '', 
          port: '', 
          type: 'image', 
          isPrimary: true,
          parameterMappings: []
        }]
  );
  // 添加节点参数设置状态
  const [nodeParameters, setNodeParameters] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appNameExists, setAppNameExists] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        timeoutSec: initialData.timeoutSec || 60,
        modelType: initialData.modelType || 'SD',
        maxRuntime: initialData.maxRuntime || 300,
        enableCache: initialData.enableCache || false,
        errorHandling: initialData.errorHandling || 'retry',
        resourcePriority: initialData.resourcePriority || 'GPU',
        concurrencyLimit: initialData.concurrencyLimit || 1,
        rateLimit: initialData.rateLimit || 10
      });
      
      if (initialData.outputs && initialData.outputs.length > 0) {
        const initialOutputs = initialData.outputs.map((output, index) => ({
          key: index,
          nodeId: output.nodeId,
          port: output.port,
          type: output.type,
          isPrimary: output.isPrimary || false,
          parameterMappings: output.parameterMappings || []
        }));
        setOutputs(initialOutputs);
      }
      
      // 初始化节点参数
      if (initialData.nodeParameters) {
        setNodeParameters(initialData.nodeParameters);
      }
    }
  }, [initialData]);

  // 获取节点选项
  const getNodeOptions = () => {
    if (!workflowData?.mappableOutputs) return [];
    
    // 使用Map去除重复的节点ID，并收集所有端口
    const nodeMap = new Map();
    workflowData.mappableOutputs.forEach(output => {
      if (!nodeMap.has(output.nodeId)) {
        nodeMap.set(output.nodeId, {
          nodeId: output.nodeId,
          nodeTitle: output.nodeTitle,
          ports: []
        });
      }
      const node = nodeMap.get(output.nodeId);
      // 避免重复端口
      if (!node.ports.some(p => p.port === output.port)) {
        node.ports.push({
          port: output.port,
          type: output.type
        });
      }
    });
    
    return Array.from(nodeMap.values()).map(node => ({
      value: node.nodeId,
      label: `[${node.nodeId}] ${node.nodeTitle || '未命名节点'}`,
      ports: node.ports
    }));
  };

  // 获取特定节点的端口选项
  const getPortOptions = (nodeId) => {
    const nodeOptions = getNodeOptions();
    const node = nodeOptions.find(n => n.value == nodeId);
    return node ? node.ports : [];
  };

  // 获取工作流参数选项
  const getWorkflowParamOptions = () => {
    if (!workflowData || !workflowData.parameters) return [];
    
    return Object.keys(workflowData.parameters).map(key => {
      const param = workflowData.parameters[key];
      return {
        value: key,
        label: param.title || key,
        description: param.description || `${param.nodeType} - ${param.port}`,
        nodeId: param.nodeId,
        port: param.port,
        type: param.type
      };
    });
  };

  // 添加产出节点
  const addOutput = () => {
    setOutputs([...outputs, { 
      key: Date.now(), 
      nodeId: '', 
      port: '', 
      type: 'image', 
      isPrimary: false,
      parameterMappings: []
    }]);
  };

  // 删除产出节点
  const removeOutput = (key) => {
    if (outputs.length <= 1) {
      setErrors(prev => ({ ...prev, outputs: '至少需要保留一个产出节点' }));
      return;
    }
    setOutputs(outputs.filter(output => output.key !== key));
    setErrors(prev => ({ ...prev, outputs: '' }));
  };

  // 更新产出节点
  const updateOutput = (key, field, value) => {
    setOutputs(outputs.map(output => {
      if (output.key === key) {
        const updatedOutput = { ...output, [field]: value };
        
        // 如果是节点ID变更，自动设置第一个端口
        if (field === 'nodeId') {
          const ports = getPortOptions(value);
          if (ports.length > 0) {
            updatedOutput.port = ports[0].port;
          } else {
            updatedOutput.port = '';
          }
          // 清除参数映射
          updatedOutput.parameterMappings = [];
        }
        
        return updatedOutput;
      }
      return output;
    }));
  };

  // 添加参数映射
  const addParameterMapping = (outputKey, paramKey) => {
    setOutputs(outputs.map(output => {
      if (output.key === outputKey) {
        // 检查是否已存在该参数映射
        const existingMapping = output.parameterMappings.find(mapping => mapping.paramKey === paramKey);
        if (!existingMapping) {
          const param = workflowData.parameters[paramKey];
          return {
            ...output,
            parameterMappings: [
              ...output.parameterMappings,
              {
                paramKey,
                nodeId: param.nodeId,
                port: param.port,
                title: param.title || paramKey,
                type: param.type
              }
            ]
          };
        }
      }
      return output;
    }));
  };

  // 删除参数映射
  const removeParameterMapping = (outputKey, paramKey) => {
    setOutputs(outputs.map(output => {
      if (output.key === outputKey) {
        return {
          ...output,
          parameterMappings: output.parameterMappings.filter(mapping => mapping.paramKey !== paramKey)
        };
      }
      return output;
    }));
  };

  // 更新节点参数
  const updateNodeParameter = (nodeId, paramKey, value) => {
    setNodeParameters(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        [paramKey]: value
      }
    }));
  };

  // 检查应用名唯一性
  const checkAppName = async (name) => {
    if (!name) return;
    
    try {
      // 确保使用正确的API端点
      const response = await axios.get(`/api/apps/check-name?name=${encodeURIComponent(name)}${initialData?.id ? `&excludeId=${initialData.id}` : ''}`);
      setAppNameExists(response.data.exists);
      if (response.data.exists) {
        setErrors(prev => ({ ...prev, name: '应用名称已存在' }));
      } else {
        setErrors(prev => ({ ...prev, name: '' }));
      }
    } catch (error) {
      console.error('检查应用名失败:', error);
      // 即使检查失败，也不应该阻止用户提交表单
      setErrors(prev => ({ ...prev, name: '' }));
    }
  };

  // 处理表单输入变化
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'name') {
      checkAppName(value);
    }
    
    // 清除相关错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 验证表单
    const newErrors = {};
    
    if (!formData.name) {
      newErrors.name = '请输入应用名称';
    } else if (appNameExists) {
      newErrors.name = '应用名称已存在';
    }
    
    if (!formData.timeoutSec || formData.timeoutSec < 1 || formData.timeoutSec > 3600) {
      newErrors.timeoutSec = '超时时间应在1-3600秒之间';
    }
    
    // 验证产出节点配置
    const hasValidOutput = outputs.some(output => output.nodeId && output.type);
    if (!hasValidOutput) {
      newErrors.outputs = '请至少配置一个有效的产出节点';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    // 构造产出节点配置
    const outputConfigs = outputs.map(output => ({
      nodeId: output.nodeId,
      port: output.port,
      type: output.type,
      isPrimary: output.isPrimary,
      parameterMappings: output.parameterMappings
    }));

    const appConfig = {
      name: formData.name,
      workflowId: workflowData?.workflow_id || workflowData?.workflowId,
      workflowVersion: workflowData?.version || 1,
      timeoutSec: formData.timeoutSec,
      modelType: formData.modelType,
      maxRuntime: formData.maxRuntime,
      enableCache: formData.enableCache,
      errorHandling: formData.errorHandling,
      resourcePriority: formData.resourcePriority,
      concurrencyLimit: formData.concurrencyLimit,
      rateLimit: formData.rateLimit,
      outputs: outputConfigs,
      nodeParameters // 添加节点参数
    };

    try {
      let response;
      if (initialData?.id) {
        // 更新应用
        response = await axios.patch(`/api/apps/${initialData.id}`, appConfig);
      } else {
        // 创建应用
        response = await axios.post('/api/apps', appConfig);
      }
      
      onNext(response.data);
    } catch (error) {
      console.error('应用配置提交失败:', error);
      const errorMsg = error.response?.data?.error?.message || (initialData?.id ? '更新应用配置失败' : '创建应用配置失败');
      setErrors(prev => ({ ...prev, submit: errorMsg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取节点的参数配置字段（示例）
  const getNodeParameterFields = (nodeId) => {
    // 这里应该根据实际的节点类型返回不同的参数字段
    // 暂时返回一些示例字段
    return [
      { key: 'filename_prefix', label: '文件名前缀', type: 'text', defaultValue: 'output' },
      { key: 'output_path', label: '输出路径', type: 'text', defaultValue: './output' },
      { key: 'max_size_kb', label: '最大大小(KB)', type: 'number', defaultValue: 1024 },
      { key: 'min_size_kb', label: '最小大小(KB)', type: 'number', defaultValue: 10 },
      { key: 'start_quality', label: '起始质量', type: 'number', defaultValue: 95 }
    ];
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 mb-6">{t('appConfig.title')}</h3>
      
      {/* Tab导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('appConfig.basicTab')}
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'advanced'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('appConfig.advancedTab')}
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* 应用名称 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('appConfig.appName')}
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="例如: removeLogo"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* 超时时间 */}
            <div>
              <label htmlFor="timeoutSec" className="block text-sm font-medium text-gray-700 mb-1">
                {t('appConfig.timeout')}
              </label>
              <input
                type="number"
                id="timeoutSec"
                value={formData.timeoutSec}
                onChange={(e) => handleInputChange('timeoutSec', parseInt(e.target.value) || 0)}
                min="1"
                max="3600"
                placeholder="例如: 600"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.timeoutSec ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.timeoutSec && (
                <p className="mt-1 text-sm text-red-600">{errors.timeoutSec}</p>
              )}
            </div>

            {/* 模型类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型类型
              </label>
              <select
                value={formData.modelType}
                onChange={(e) => handleInputChange('modelType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SD">Stable Diffusion</option>
                <option value="FLUX">FLUX</option>
                <option value="OTHER">其他</option>
              </select>
            </div>

            {/* 最大运行时长 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                最大运行时长(秒)
              </label>
              <input
                type="number"
                value={formData.maxRuntime}
                onChange={(e) => handleInputChange('maxRuntime', parseInt(e.target.value) || 300)}
                min="1"
                max="3600"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* 产出节点配置 */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700">{t('appConfig.outputNodes')}</h4>
                <button
                  type="button"
                  onClick={addOutput}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="-ml-0.5 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  {t('appConfig.addNode')}
                </button>
              </div>
              
              {errors.outputs && (
                <p className="text-sm text-red-600 mb-3">{errors.outputs}</p>
              )}
              
              <div className="space-y-4">
                {outputs.map((output, index) => (
                  <div key={output.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-sm font-medium text-gray-700">产出节点 #{index + 1}</h5>
                      {outputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOutput(output.key)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* 选择产出节点 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('appConfig.nodeId')}
                        </label>
                        <select
                          value={output.nodeId || ''}
                          onChange={(e) => updateOutput(output.key, 'nodeId', parseInt(e.target.value) || '')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">请选择节点</option>
                          {getNodeOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* 选择端口 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('appConfig.port')}
                        </label>
                        <select
                          value={output.port || ''}
                          onChange={(e) => updateOutput(output.key, 'port', e.target.value)}
                          disabled={!output.nodeId}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                        >
                          <option value="">请选择端口</option>
                          {output.nodeId && getPortOptions(output.nodeId).map(port => (
                            <option key={port.port} value={port.port}>
                              {port.port} ({port.type})
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* 产出类型 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {t('appConfig.outputType')}
                        </label>
                        <select
                          value={output.type}
                          onChange={(e) => updateOutput(output.key, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="image">图片</option>
                          <option value="video">视频</option>
                          <option value="text">文本</option>
                          <option value="file">文件</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* 参数映射 */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h6 className="text-xs font-medium text-gray-700">参数映射</h6>
                        {output.nodeId && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                addParameterMapping(output.key, e.target.value);
                                e.target.value = ''; // 重置选择
                              }
                            }}
                            className="text-xs px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">添加参数映射</option>
                            {getWorkflowParamOptions()
                              .filter(param => param.nodeId == output.nodeId) // 只显示当前节点的参数
                              .map(param => (
                                <option 
                                  key={param.value} 
                                  value={param.value}
                                  disabled={output.parameterMappings.some(mapping => mapping.paramKey === param.value)}
                                >
                                  {param.label}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                      
                      {output.parameterMappings.length > 0 ? (
                        <div className="space-y-2">
                          {output.parameterMappings.map(mapping => (
                            <div key={mapping.paramKey} className="flex items-center justify-between bg-white p-2 rounded border">
                              <div className="text-xs">
                                <div className="font-medium">{mapping.title}</div>
                                <div className="text-gray-500">{mapping.nodeId}.{mapping.port} ({mapping.type})</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeParameterMapping(output.key, mapping.paramKey)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 py-2">
                          尚未添加参数映射
                        </div>
                      )}
                    </div>
                    
                    {/* 主产出开关 */}
                    <div className="flex items-center">
                      <input
                        id={`primary-${output.key}`}
                        type="checkbox"
                        checked={output.isPrimary}
                        onChange={(e) => updateOutput(output.key, 'isPrimary', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`primary-${output.key}`} className="ml-2 block text-sm text-gray-700">
                        {t('appConfig.primaryOutput')}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* 节点参数设置 */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('appConfig.nodeParams')}</h4>
              
              {outputs.filter(output => output.nodeId).map((output, index) => {
                const nodeParams = nodeParameters[output.nodeId] || {};
                const paramFields = getNodeParameterFields(output.nodeId);
                
                return (
                  <div key={`params-${output.key}`} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">
                      节点 [{output.nodeId}] {getNodeOptions().find(n => n.value == output.nodeId)?.label.split('] ')[1] || ''} 参数设置
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {paramFields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            {field.label}
                          </label>
                          {field.type === 'number' ? (
                            <input
                              type="number"
                              value={nodeParams[field.key] !== undefined ? nodeParams[field.key] : field.defaultValue}
                              onChange={(e) => updateNodeParameter(output.nodeId, field.key, parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={nodeParams[field.key] !== undefined ? nodeParams[field.key] : field.defaultValue}
                              onChange={(e) => updateNodeParameter(output.nodeId, field.key, e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {outputs.filter(output => output.nodeId).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  请先在基础配置中选择产出节点
                </div>
              )}
            </div>
            
            {/* 其他高级配置选项 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('appConfig.otherSettings')}</h4>
              <div className="space-y-4">
                {/* 模型类型 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    模型类型
                  </label>
                  <select
                    value={formData.modelType}
                    onChange={(e) => handleInputChange('modelType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="SD">Stable Diffusion</option>
                    <option value="FLUX">FLUX</option>
                    <option value="OTHER">其他</option>
                  </select>
                </div>
                
                {/* 最大运行时长 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    最大运行时长(秒)
                  </label>
                  <input
                    type="number"
                    value={formData.maxRuntime}
                    onChange={(e) => handleInputChange('maxRuntime', parseInt(e.target.value) || 300)}
                    min="1"
                    max="3600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                {/* 启用缓存 */}
                <div className="flex items-center">
                  <input
                    id="enable-cache"
                    type="checkbox"
                    checked={formData.enableCache}
                    onChange={(e) => handleInputChange('enableCache', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enable-cache" className="ml-2 block text-sm text-gray-700">
                    启用缓存
                  </label>
                </div>
                
                {/* 错误处理策略 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    错误处理策略
                  </label>
                  <select
                    value={formData.errorHandling}
                    onChange={(e) => handleInputChange('errorHandling', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="retry">重试</option>
                    <option value="fallback">降级</option>
                    <option value="fail">直接失败</option>
                  </select>
                </div>
                
                {/* 资源优先级 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    资源优先级
                  </label>
                  <select
                    value={formData.resourcePriority}
                    onChange={(e) => handleInputChange('resourcePriority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="GPU">GPU优先</option>
                    <option value="CPU">CPU优先</option>
                    <option value="AUTO">自动</option>
                  </select>
                </div>
                
                {/* 并发控制 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    并发限制
                  </label>
                  <input
                    type="number"
                    value={formData.concurrencyLimit}
                    onChange={(e) => handleInputChange('concurrencyLimit', parseInt(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                {/* 调用速率限制 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    调用速率限制(次/分钟)
                  </label>
                  <input
                    type="number"
                    value={formData.rateLimit}
                    onChange={(e) => handleInputChange('rateLimit', parseInt(e.target.value) || 10)}
                    min="1"
                    max="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 提交错误 */}
        {errors.submit && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {errors.submit}
                </h3>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common.previous')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </>
            ) : (
              t('common.next')
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AppConfigForm;