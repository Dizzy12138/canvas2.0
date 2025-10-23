import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import useAppBuilderStore from '../store/useAppBuilderStore';
import useWorkflowStore from '../store/useWorkflowStore';

const AppRunner = () => {
  const { appId: routeAppId } = useParams();
  const {
    appId,
    appName,
    paramsSchema,
    uiBindings,
    initApp,
    setAppId,
  } = useAppBuilderStore((state) => ({
    appId: state.appId,
    appName: state.appName,
    paramsSchema: state.paramsSchema,
    uiBindings: state.uiBindings,
    initApp: state.initApp,
    setAppId: state.setAppId,
  }));
  const { fetchWorkflow } = useWorkflowStore();

  const resolvedAppId = routeAppId || appId;

  const [loading, setLoading] = useState(false);
  const [inputValues, setInputValues] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!resolvedAppId) return;

    const loadApp = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/apps/${resolvedAppId}`);
        const appData = response.data?.data;
        if (appData) {
          initApp(appData);
          setAppId(appData._id || appData.id || resolvedAppId);
          if (appData.workflowId) {
            await fetchWorkflow(appData.workflowId);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || '加载应用失败');
      } finally {
        setLoading(false);
      }
    };

    loadApp();
  }, [resolvedAppId, initApp, setAppId, fetchWorkflow]);

  useEffect(() => {
    if (!Array.isArray(paramsSchema)) return;
    const initialValues = {};
    paramsSchema
      .filter((param) => param.expose !== false)
      .forEach((param) => {
        if (param.type === 'boolean') {
          initialValues[param.path] = param.defaultValue ?? false;
        } else if (param.type === 'number') {
          const fallback = Number(param.defaultValue);
          initialValues[param.path] = Number.isNaN(fallback) ? 0 : fallback;
        } else {
          initialValues[param.path] = param.defaultValue ?? '';
        }
      });
    setInputValues(initialValues);
  }, [paramsSchema]);

  const handleInputChange = (path, value) => {
    setInputValues((prev) => ({ ...prev, [path]: value }));
  };

  const bindingMap = useMemo(() => {
    if (!Array.isArray(uiBindings)) return new Map();
    return new Map(uiBindings.map((binding) => [binding.bindTo, binding]));
  }, [uiBindings]);

  const handleExecute = async () => {
    if (!resolvedAppId) {
      setError('缺少应用 ID，无法执行');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      const payloadInputs = {};
      (paramsSchema || [])
        .filter((param) => param.expose !== false)
        .forEach((param) => {
          const binding = bindingMap.get(param.path);
          const value = inputValues[param.path];
          if (!binding) {
            payloadInputs[param.path] = value;
          } else {
            payloadInputs[binding.componentId] = value;
          }
        });

      const response = await axios.post(`/api/comfy/apps/${resolvedAppId}/run`, {
        uiInputs: payloadInputs,
      });

      setExecutionResult(response.data?.data || response.data);
    } catch (err) {
      setError(err.response?.data?.message || '执行失败');
    } finally {
      setIsExecuting(false);
    }
  };

  const renderInputControl = (param) => {
    const value = inputValues[param.path];
    switch (param.type) {
      case 'number':
        return (
          <input
            type="number"
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={value ?? ''}
            onChange={(e) => handleInputChange(param.path, e.target.value === '' ? '' : Number(e.target.value))}
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(value)}
            onChange={(e) => handleInputChange(param.path, e.target.checked)}
          />
        );
      case 'text':
      case 'string':
      default:
        return (
          <textarea
            className="w-full rounded border border-gray-300 px-3 py-2"
            rows={3}
            value={value ?? ''}
            onChange={(e) => handleInputChange(param.path, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{appName || '运行应用'}</h2>
            {resolvedAppId && (
              <p className="text-sm text-gray-500">应用 ID: {resolvedAppId}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isExecuting || loading}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
              isExecuting || loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isExecuting ? '执行中...' : '运行工作流'}
          </button>
        </div>
      </div>

      {!resolvedAppId && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          当前未选择具体应用，请在应用构建器中保存应用后再运行。
        </div>
      )}

      {loading && (
        <div className="rounded-md border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
          正在加载应用配置...
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">输入参数</h3>
          {(paramsSchema || [])
            .filter((param) => param.expose !== false)
            .map((param) => (
              <div key={param.id || param.path} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{param.label || param.name || param.path}</p>
                    <p className="text-xs text-gray-500">绑定路径: {param.path}</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{param.type}</span>
                </div>
                <div className="mt-3">{renderInputControl(param)}</div>
              </div>
            ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">执行结果</h3>
          {isExecuting && <div className="text-sm text-gray-500">执行中，请稍候...</div>}
          {executionResult && (
            <pre className="max-h-[420px] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              {JSON.stringify(executionResult, null, 2)}
            </pre>
          )}
          {!isExecuting && !executionResult && (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              运行应用后将在此处显示返回结果。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppRunner;

