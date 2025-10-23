import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useWorkflowStore from "@/store/useWorkflowStore";
import useAppBuilderStore from "@/store/useAppBuilderStore";
import ParameterCascader from "@/components/ParameterCascader";
import useTranslation from "@/hooks/useTranslation";

const AppConfigForm = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const { workflow, loading: workflowLoading } = useWorkflowStore();
  const { appId, appName, paramsSchema, setParamsSchema, initApp } = useAppBuilderStore();

  const [formData, setFormData] = useState({
    name: appName || '',
  });
  const [exposedParams, setExposedParams] = useState(paramsSchema || []); // [ { path: 'KSampler.cfg', name: 'cfg', type: 'float' } ]
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (appName) {
      setFormData(prev => ({ ...prev, name: appName }));
    }
    if (paramsSchema) {
      setExposedParams(paramsSchema);
    }
  }, [appName, paramsSchema]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addExposedParam = () => {
    setExposedParams([...exposedParams, { id: `param_${Date.now()}`, path: '', name: '', type: '' }]);
  };

  const removeExposedParam = (id) => {
    setExposedParams(exposedParams.filter(p => p.id !== id));
  };

  const updateExposedParam = (id, newPath) => {
    const [nodeName, paramKey] = newPath.split('.');
    // Find param details from cascaderData
    const node = workflow.cascaderData.find(n => n.value === nodeName);
    const param = node?.children.find(c => c.value === newPath);

    setExposedParams(exposedParams.map(p => 
      p.id === id 
        ? { ...p, path: newPath, name: paramKey, type: param?.type || 'unknown' } 
        : p
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name) newErrors.name = '请输入应用名称';
    if (exposedParams.length === 0 || exposedParams.some(p => !p.path)) {
      newErrors.params = '请至少暴露一个有效的参数';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const appConfig = {
      name: formData.name,
      workflowId: workflow.workflow_id,
      paramsSchema: exposedParams,
      // The uiBindings will be handled in the PageBuilder
    };

    try {
      let response;
      if (appId) {
        // Update existing app
        response = await axios.patch(`/api/apps/${appId}`, appConfig);
      } else {
        // Create new app
        response = await axios.post('/api/apps', appConfig);
      }
      const savedApp = response.data.data;
      initApp(savedApp); // Update the store with the saved app data
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

  if (!workflow) {
    return (
      <div className="text-center text-gray-500">
        <p>请先返回上一步上传并解析一个工作流。</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">返回</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="appName" className="block text-sm font-medium text-gray-700">应用名称</label>
        <input
          type="text"
          id="appName"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name}</p>}
      </div>

      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-900">暴露给前端的参数</h3>
        {exposedParams.map((param, index) => (
          <div key={param.id} className="flex items-center space-x-4 p-4 border rounded-md">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-500">绑定工作流参数</label>
              <ParameterCascader
                options={workflow.cascaderData || []}
                value={param.path}
                onChange={(path) => updateExposedParam(param.id, path)}
              />
            </div>
            <div className="w-1/4">
                <label className="block text-sm font-medium text-gray-500">参数类型</label>
                <input type="text" readOnly value={param.type || 'N/A'} className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm" />
            </div>
            <div className="pt-5">
              <button type="button" onClick={() => removeExposedParam(param.id)} className="text-red-600 hover:text-red-800">
                删除
              </button>
            </div>
          </div>
        ))}
        {errors.params && <p className="mt-2 text-sm text-red-600">{errors.params}</p>}
        <button
          type="button"
          onClick={addExposedParam}
          className="w-full flex justify-center py-2 px-4 border border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + 添加参数
        </button>
      </div>

      {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

      <div className="flex justify-between pt-4">
        <button type="button" onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('common.previous')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? '保存中...' : '保存并下一步'}
        </button>
      </div>
    </form>
  );
};

export default AppConfigForm;
