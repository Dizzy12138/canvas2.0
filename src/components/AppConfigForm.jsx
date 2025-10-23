import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import useWorkflowStore from '@/store/useWorkflowStore';
import useAppBuilderStore from '@/store/useAppBuilderStore';
import ParameterCascader from '@/components/ParameterCascader';
import useTranslation from '@/hooks/useTranslation';

const AppConfigForm = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const {
    workflowId,
    cascaderData,
    parameterLookup,
    loading: workflowLoading,
  } = useWorkflowStore();
  const {
    appId,
    appName,
    paramsSchema,
    setParamsSchema,
    initApp,
    setAppName,
  } = useAppBuilderStore();

  const [formData, setFormData] = useState({
    name: appName || '',
  });
  const [exposedParams, setExposedParams] = useState(paramsSchema || []);
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

  const cascaderOptions = useMemo(() => cascaderData || [], [cascaderData]);

  const findParamMetadata = (path) => {
    if (!path) return null;
    return parameterLookup?.[path] || null;
  };

  const buildParamFromMetadata = (param, metadata, path) => {
    if (!path) {
      return {
        ...param,
        path: '',
        name: '',
        label: '',
        type: 'string',
        defaultValue: '',
        nodeLabel: '',
        nodeKey: '',
        nodeId: null,
        invalid: false,
      };
    }

    if (!metadata) {
      const [nodePart = '', paramPart = ''] = path.split('.');
      return {
        ...param,
        path,
        name: paramPart,
        label: path,
        type: 'unknown',
        defaultValue: '',
        nodeLabel: nodePart,
        nodeKey: nodePart,
        nodeId: null,
        invalid: true,
      };
    }

    const hasPathChanged = param.path !== path;
    const shouldResetDefault =
      hasPathChanged ||
      param.defaultValue === undefined ||
      param.defaultValue === '' ||
      param.defaultValue === null;

    let nextDefaultValue = shouldResetDefault ? metadata.default : param.defaultValue;

    if (nextDefaultValue === undefined) {
      if (metadata.type === 'boolean') {
        nextDefaultValue = false;
      } else if (metadata.type === 'number') {
        nextDefaultValue = null;
      } else {
        nextDefaultValue = '';
      }
    }

    return {
      ...param,
      path,
      name: metadata.paramKey || metadata.label || metadata.originalName || metadata.key || '',
      label: metadata.label || metadata.paramKey || metadata.originalName || path,
      type: metadata.type || 'string',
      defaultValue: nextDefaultValue,
      nodeLabel: metadata.nodeLabel || metadata.nodeKey || '',
      nodeKey: metadata.nodeKey || metadata.nodeLabel || '',
      nodeId: metadata.nodeId ?? null,
      invalid: false,
    };
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'name') {
      setAppName(value);
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addExposedParam = () => {
    setExposedParams([
      ...exposedParams,
      {
        id: `param_${Date.now()}`,
        path: '',
        name: '',
        label: '',
        type: 'string',
        defaultValue: '',
        nodeLabel: '',
        nodeKey: '',
        nodeId: null,
        expose: true,
        invalid: false,
      },
    ]);
  };

  const removeExposedParam = (id) => {
    setExposedParams(exposedParams.filter(p => p.id !== id));
  };

  const updateExposedParam = (id, newPath) => {
    const resolvedPath = typeof newPath === 'string' ? newPath : '';
    const metadata = findParamMetadata(resolvedPath);
    setExposedParams((prev) =>
      prev.map((param) =>
        param.id === id
          ? buildParamFromMetadata(param, metadata, resolvedPath)
          : param,
      ),
    );
  };

  const updateDefaultValue = (id, rawValue) => {
    setExposedParams((prev) =>
      prev.map((param) => {
        if (param.id !== id) return param;

        if (param.type === 'number') {
          if (rawValue === '') {
            return {
              ...param,
              defaultValue: null,
            };
          }

          const numericValue = Number(rawValue);
          if (Number.isNaN(numericValue)) {
            return param;
          }

          return {
            ...param,
            defaultValue: numericValue,
          };
        }

        return {
          ...param,
          defaultValue: rawValue,
        };
      }),
    );
  };

  const toggleExpose = (id) => {
    setExposedParams((prev) =>
      prev.map((param) =>
        param.id === id
          ? { ...param, expose: !param.expose }
          : param,
      ),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.name) newErrors.name = '请输入应用名称';

    const activeParams = exposedParams.filter((param) => param.expose !== false);

    if (
      activeParams.length === 0 ||
      activeParams.some((p) => !p.path || p.invalid)
    ) {
      newErrors.params = '请至少暴露一个有效的参数';
    }

    const duplicatePaths = new Set();
    const duplicated = activeParams.some((param) => {
      if (duplicatePaths.has(param.path)) return true;
      duplicatePaths.add(param.path);
      return false;
    });

    if (duplicated) {
      newErrors.params = '同一个工作流参数只能绑定一次';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    const paramsPayload = exposedParams.map((param) => ({
      id: param.id,
      path: param.path,
      name: param.name,
      label: param.label,
      type: param.type,
      defaultValue: param.defaultValue,
      nodeId: param.nodeId,
      nodeKey: param.nodeKey,
      nodeLabel: param.nodeLabel,
      expose: param.expose !== false,
    }));

    const appConfig = {
      name: formData.name,
      workflowId: workflowId,
      paramsSchema: paramsPayload,
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
      setParamsSchema(paramsPayload);
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
        {exposedParams.map((param) => {
          const metadata = findParamMetadata(param.path);
          const displayNodeLabel = metadata?.nodeLabel || param.nodeLabel;
          const displayParamKey = metadata?.paramKey || metadata?.label || param.name || param.label || param.path;
          const isInvalid = param.invalid || (!param.path && param.expose !== false);
          return (
            <div
              key={param.id}
              className={`space-y-3 p-4 border rounded-md ${isInvalid ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-500">绑定工作流参数</label>
                  <ParameterCascader
                    options={cascaderOptions}
                    value={param.path || null}
                    onChange={(path) => updateExposedParam(param.id, path)}
                  />
                  {displayNodeLabel && (
                    <p className="mt-1 text-xs text-gray-500">绑定路径: {displayNodeLabel}.{displayParamKey}</p>
                  )}
                </div>
                <div className="w-40">
                  <label className="block text-sm font-medium text-gray-500">参数类型</label>
                  <input
                    type="text"
                    readOnly
                    value={param.type || metadata?.type || 'N/A'}
                    className="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div className="w-40">
                  <label className="block text-sm font-medium text-gray-500">默认值</label>
                  {param.type === 'boolean' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(param.defaultValue)}
                        onChange={(e) => updateDefaultValue(param.id, e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-xs text-gray-500">{Boolean(param.defaultValue) ? '开启' : '关闭'}</span>
                    </div>
                  ) : (
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      value={param.defaultValue ?? ''}
                      onChange={(e) => updateDefaultValue(param.id, e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={param.expose !== false}
                    onChange={() => toggleExpose(param.id)}
                    className="mr-2"
                  />
                  是否前端暴露
                </label>
                <button
                  type="button"
                  onClick={() => removeExposedParam(param.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  删除
                </button>
              </div>
              {isInvalid && (
                <p className="text-sm text-red-600">请选择有效的工作流参数</p>
              )}
            </div>
          );
        })}
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
