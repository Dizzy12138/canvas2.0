import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/api/index.js';
import useWorkflowStore from '@/store/useWorkflowStore';
import ParameterCascader from '@/components/ParameterCascader';
import useAppBuilderStore from '@/store/useAppBuilderStore';
import useTranslation from '@/hooks/useTranslation';

const AppConfigForm = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const {
    workflowId,
    parameterLookup,
    nodesTree,
    loading: workflowLoading,
    outputNodes: detectedOutputNodes
  } = useWorkflowStore();
  const {
    appId,
    appName,
    outputNodes,
    timeout,
    initApp,
    setAppName,
    setOutputNodes,
    setTimeout,
  } = useAppBuilderStore();

  const [formData, setFormData] = useState({
    name: appName || '',
    timeout: timeout || 300,
  });
  const [outputNodeConfigs, setOutputNodeConfigs] = useState(
    outputNodes || [{ nodeId: '', outputPath: '', outputType: 'image' }]
  );
  const [advancedConfig, setAdvancedConfig] = useState({
    batchSize: 1,
    deviceType: 'auto',
    concurrency: 1,
    retryCount: 3,
    customParams: {}
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (appName) {
      setFormData(prev => ({ ...prev, name: appName }));
    }
  }, [appName]);

  useEffect(() => {
    if (outputNodes) {
      setOutputNodeConfigs(outputNodes);
    }
  }, [outputNodes]);

  // 生成输出节点选项（放开过滤：优先使用后端识别到的 outputNodes，否则使用全部节点）
  const getOutputNodeOptions = () => {
    // 后端已识别的输出节点
    if (Array.isArray(detectedOutputNodes) && detectedOutputNodes.length > 0) {
      return detectedOutputNodes.map((out) => ({
        value: out.id,
        label: `[${out.id}]${out.name || out.outputName || out.type || 'Unknown'}`,
        nodeId: out.id,
        nodeName: out.name || out.outputName,
        nodeType: out.type,
      }));
    }

    // 回退：展示所有节点供用户自行判断
    if (!nodesTree || !Array.isArray(nodesTree)) return [];
    return nodesTree.map((node) => ({
      value: node.id,
      label: `[${node.id}]${node.name || node.type || node.class_type || 'Unknown'}`,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type || node.class_type,
    }));
  };

  const cascaderOptions = useWorkflowStore.getState().cascaderData || [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name') {
      setAppName(value);
    }
    if (field === 'timeout') {
      setTimeout(value);
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOutputNodeChange = (index, field, value) => {
    const newConfigs = [...outputNodeConfigs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setOutputNodeConfigs(newConfigs);
    setOutputNodes(newConfigs);
  };

  // 选择级联参数后，自动填充 nodeId 与路径
  const handleOutputPathSelect = (index, path) => {
    const info = (parameterLookup || {})[path] || {};
    const nodeIdFromPath = info.nodeId || '';
    const newConfigs = [...outputNodeConfigs];
    newConfigs[index] = {
      ...newConfigs[index],
      nodeId: nodeIdFromPath,
      outputPath: path,
    };
    setOutputNodeConfigs(newConfigs);
    setOutputNodes(newConfigs);
  };

  const addOutputNode = () => {
    const newConfigs = [...outputNodeConfigs, { nodeId: '', outputType: 'image' }];
    setOutputNodeConfigs(newConfigs);
    setOutputNodes(newConfigs);
  };

  const removeOutputNode = (index) => {
    if (outputNodeConfigs.length > 1) {
      const newConfigs = outputNodeConfigs.filter((_, i) => i !== index);
      setOutputNodeConfigs(newConfigs);
      setOutputNodes(newConfigs);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!formData.name) newErrors.name = '请输入应用名称';
    if (!formData.timeout || formData.timeout < 1) newErrors.timeout = '请输入有效的超时时间';
    
    // 验证产出节点配置
    const hasValidOutputNode = outputNodeConfigs.some(config => config.nodeId || config.outputPath);
    if (!hasValidOutputNode) {
      newErrors.outputNodes = '请至少配置一个产出节点';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    // 自动生成所有暴露的参数配置
    const allExposedParams = Object.entries(parameterLookup || {})
      .filter(([path, param]) => param.expose !== false)
      .map(([path, param]) => ({
        id: `param_${Date.now()}_${Math.random()}`,
        path: path,
        name: param.paramKey || param.label,
        label: param.label || param.paramKey,
        type: param.type || 'string',
        defaultValue: param.default,
        nodeId: param.nodeId,
        nodeKey: param.nodeKey,
        nodeLabel: param.nodeLabel,
        expose: true,
      }));

    const appConfig = {
      name: formData.name,
      workflowId: workflowId,
      workflowVersion: 1,
      timeout: parseInt(formData.timeout),
      outputNodes: outputNodeConfigs.filter(config => config.nodeId || config.outputPath),
      paramsSchema: allExposedParams,
    };

    try {
      let response;
      if (appId) {
        // 先检查应用是否存在
        try {
          await api.get(`/apps/${appId}`);
          // 应用存在，更新它
          response = await api.patch(`/apps/${appId}`, appConfig);
        } catch (checkError) {
          if (checkError.response?.status === 404) {
            // 应用不存在，创建新应用
            console.log('App not found, creating new app instead');
            response = await api.post('/apps', appConfig);
          } else {
            throw checkError;
          }
        }
      } else {
        // Create new app
        response = await api.post('/apps', appConfig);
      }
      const savedApp = response.data.data;
      initApp(savedApp);
      onNext(savedApp._id);
    } catch (error) {
      console.error('Failed to save app configuration:', error);
      setErrors({ submit: error.response?.data?.message || '保存失败' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (workflowLoading) {
    return <div>加载工作流数据中...</div>;
  }

  if (!workflowId) {
    return (
      <div className="text-center text-gray-500">
        <p>请先返回上一步上传并解析一个工作流。</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">返回</button>
      </div>
    );
  }

  const outputNodeOptions = getOutputNodeOptions();

  return (
    <div className="max-w-4xl mx-auto">
      {/* 标签页导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            基础配置
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'advanced'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            高级配置
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'basic' && (
          <>
            {/* 应用名称 */}
            <div>
              <label htmlFor="appName" className="block text-sm font-medium text-gray-700">
                *应用名称 (唯一,建议英文)
              </label>
              <input
                type="text"
                id="appName"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="请输入应用名称"
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* 超时时间 */}
            <div>
              <label htmlFor="timeout" className="block text-sm font-medium text-gray-700">
                超时时间 (默认60s)
              </label>
              <input
                type="number"
                id="timeout"
                value={formData.timeout}
                onChange={(e) => handleInputChange('timeout', e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="300"
                min="1"
              />
              {errors.timeout && <p className="mt-2 text-sm text-red-600">{errors.timeout}</p>}
            </div>

            {/* 产出节点配置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                *产出节点配置
              </label>
              
              {outputNodeConfigs.map((config, index) => (
                <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">产出节点 {index + 1}</h4>
                    {outputNodeConfigs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOutputNode(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        选择节点/参数:
                      </label>
                      <ParameterCascader
                        options={cascaderOptions}
                        value={config.outputPath}
                        onChange={(val) => handleOutputPathSelect(index, val)}
                        placeholder="请选择一个节点参数作为产出"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        产出类型:
                      </label>
                      <select
                        value={config.outputType}
                        onChange={(e) => handleOutputNodeChange(index, 'outputType', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="image">图片</option>
                        <option value="text">文本</option>
                        <option value="json">JSON</option>
                        <option value="video">视频</option>
                        <option value="audio">音频</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addOutputNode}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                <span>添加新的产出节点</span>
              </button>
              
              {errors.outputNodes && <p className="mt-2 text-sm text-red-600">{errors.outputNodes}</p>}
            </div>
          </>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-6">
            {/* 批处理配置 */}
            <div>
              <label htmlFor="batchSize" className="block text-sm font-medium text-gray-700 mb-1">
                批处理大小
              </label>
              <input
                type="number"
                id="batchSize"
                min="1"
                max="10"
                value={advancedConfig.batchSize}
                onChange={(e) => setAdvancedConfig(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">同时处理的请求数量</p>
            </div>

            {/* 设备类型 */}
            <div>
              <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">
                设备类型
              </label>
              <select
                id="deviceType"
                value={advancedConfig.deviceType}
                onChange={(e) => setAdvancedConfig(prev => ({ ...prev, deviceType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="auto">自动选择</option>
                <option value="cpu">CPU</option>
                <option value="cuda">CUDA (GPU)</option>
                <option value="mps">MPS (Apple Silicon)</option>
              </select>
            </div>

            {/* 并发数 */}
            <div>
              <label htmlFor="concurrency" className="block text-sm font-medium text-gray-700 mb-1">
                并发数
              </label>
              <input
                type="number"
                id="concurrency"
                min="1"
                max="5"
                value={advancedConfig.concurrency}
                onChange={(e) => setAdvancedConfig(prev => ({ ...prev, concurrency: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">同时运行的推理任务数</p>
            </div>

            {/* 重试次数 */}
            <div>
              <label htmlFor="retryCount" className="block text-sm font-medium text-gray-700 mb-1">
                重试次数
              </label>
              <input
                type="number"
                id="retryCount"
                min="0"
                max="10"
                value={advancedConfig.retryCount}
                onChange={(e) => setAdvancedConfig(prev => ({ ...prev, retryCount: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">推理失败时的重试次数</p>
            </div>

            {/* 自定义参数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自定义推理参数
              </label>
              <textarea
                placeholder='{"steps": 20, "cfg": 7.0}'
                value={JSON.stringify(advancedConfig.customParams, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setAdvancedConfig(prev => ({ ...prev, customParams: parsed }));
                  } catch (err) {
                    // 忽略无效JSON
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
              />
              <p className="mt-1 text-sm text-gray-500">JSON格式的自定义参数，将传递给ComfyUI</p>
            </div>

            {/* 参数自动暴露信息 */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">参数自动暴露</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>系统将自动暴露工作流中的所有可配置参数（共 {Object.keys(parameterLookup || {}).length} 个）。</p>
                    <p className="mt-1">您可以在下一步的页面构建器中选择使用哪些参数。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

        {/* 底部按钮 */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <button 
            type="button" 
            onClick={onBack} 
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            上一步
          </button>
          <div className="flex space-x-3">
            <button 
              type="button" 
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSubmitting ? '保存中...' : '确认'}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name || !outputNodeConfigs.some(config => config.nodeId)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
            >
              下一步
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AppConfigForm;