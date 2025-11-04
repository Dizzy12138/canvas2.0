import React, { useState, useEffect, useMemo } from 'react';
import api from '@/api/index.js';
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
    components,
    initApp,
    setAppId,
  } = useAppBuilderStore();
  const { fetchWorkflow } = useWorkflowStore();

  const resolvedAppId = routeAppId || appId;

  // 调试日志
  console.log('AppRunner - components:', components);
  console.log('AppRunner - components length:', components?.length || 0);
  console.log('AppRunner - uiBindings:', uiBindings);
  console.log('AppRunner - paramsSchema:', paramsSchema);

  const [loading, setLoading] = useState(false);
  const [inputValues, setInputValues] = useState({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [renderItems, setRenderItems] = useState([]); // 渲染友好的输出（图片/文本等）
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [enumsData, setEnumsData] = useState(null);

  useEffect(() => {
    if (!resolvedAppId) return;

    const loadApp = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/apps/${resolvedAppId}`);
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
    const initialValues = {};

    // 优先使用组件+绑定关系来初始化
    if (Array.isArray(components) && components.length > 0 && Array.isArray(uiBindings)) {
      const bindMap = new Map(uiBindings.map(b => [b.componentId, b.bindTo]));
      components.forEach((comp) => {
        const bindTo = bindMap.get(comp.id);
        if (!bindTo) return;
        const dv = comp.defaultValue ?? comp.properties?.defaultValue ?? '';
        initialValues[bindTo] = dv;
      });
      setInputValues(initialValues);
      return;
    }

    // 否则回退到 paramsSchema 渲染
    if (Array.isArray(paramsSchema)) {
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
    }
  }, [paramsSchema, components, uiBindings]);

  // 拉取枚举（采样器/分辨率等），供选择类组件使用
  useEffect(() => {
    const loadEnums = async () => {
      try {
        const resp = await api.get('/v1/enums');
        setEnumsData(resp.data?.data || null);
      } catch (e) {
        // 忽略枚举加载失败，不阻塞运行
      }
    };
    loadEnums();
  }, []);

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

    // 前置必填与类型校验（基于规范化的 uiBindings）
    const errs = {};
    if (Array.isArray(uiBindings)) {
      uiBindings.forEach((b) => {
        const path = b.bindTo || (b.node_id && b.input_key ? `${b.node_id}.${b.input_key}` : null);
        if (!path) return;
        const val = inputValues[path];
        if (b.required) {
          if (b.type === 'image') {
            if (!val) errs[path] = '请上传图片';
          } else if (b.type === 'number' || b.type === 'integer') {
            if (val === undefined || val === null || val === '') errs[path] = '必填';
          } else {
            if (val === undefined || val === null || String(val).trim() === '') errs[path] = '必填';
          }
        }
        if (!errs[path] && b?.rules) {
          if (typeof b.rules.min === 'number' && Number(val) < b.rules.min) errs[path] = `最小值 ${b.rules.min}`;
          if (typeof b.rules.max === 'number' && Number(val) > b.rules.max) errs[path] = `最大值 ${b.rules.max}`;
          if (b.rules.pattern) {
            try {
              const re = new RegExp(b.rules.pattern);
              if (!re.test(String(val ?? ''))) errs[path] = '格式不匹配';
            } catch {}
          }
        }
      });
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('请先修复必填项或格式错误');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      // 先处理文件上传（如果有）
      const processedInputValues = { ...inputValues };
      for (const [paramPath, value] of Object.entries(inputValues)) {
        // 检查是否为 File 对象
        if (value instanceof File) {
          const binding = Array.isArray(uiBindings) 
            ? uiBindings.find(b => b.bindTo === paramPath)
            : null;
          
          // 上传文件
          const formData = new FormData();
          formData.append('file', value);
          try {
            const uploadResponse = await api.post('/uploads', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            const fileUrl = uploadResponse.data?.data?.url || uploadResponse.data?.url;
            if (fileUrl) {
              processedInputValues[paramPath] = fileUrl;
            } else {
              throw new Error('文件上传失败：未返回文件URL');
            }
          } catch (uploadErr) {
            console.error('File upload error:', uploadErr);
            throw new Error(`文件上传失败: ${uploadErr.response?.data?.message || uploadErr.message}`);
          }
        }
      }

      // 构建UI输入数据，使用组件ID作为键
      const uiInputs = {};
      Object.entries(processedInputValues).forEach(([paramPath, value]) => {
        // 查找绑定到此参数的组件
        const binding = Array.isArray(uiBindings) 
          ? uiBindings.find(b => b.bindTo === paramPath)
          : null;
        
        if (binding) {
          uiInputs[binding.componentId] = value;
        } else {
          // 如果没有绑定，直接使用参数路径
          uiInputs[paramPath] = value;
        }
      });

      const response = await api.post(`/comfy/apps/${resolvedAppId}/run`, {
        uiInputs,
      });
      const payload = response.data?.data || response.data || {};
      setExecutionResult(payload);

      // 如果存在 ComfyUI 的 prompt_id，开始轮询历史接口
      const promptId = payload?.prompt_id || payload?.promptId || payload?.data?.prompt_id;
      if (promptId) {
        await pollComfyHistory(promptId);
      } else {
        // 尝试直接解析已返回的结果
        tryParseAndRender(payload);
      }
    } catch (err) {
      console.error('Execution error:', err);
      setError(err.response?.data?.message || err.message || '执行失败');
    } finally {
      setIsExecuting(false);
    }
  };

  // 轮询 ComfyUI 历史接口，直到拿到 outputs
  const pollComfyHistory = async (promptId) => {
    let attempts = 0;
    const maxAttempts = 60; // 最长约2分钟（配合2s间隔）
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const resp = await api.get(`/comfy/history/${encodeURIComponent(promptId)}`);
        const data = resp.data?.data || resp.data;
        // ComfyUI 通常返回 { [prompt_id]: { outputs: {...} } }
        const record = data?.[promptId] || data; 
        const outputs = record?.outputs || record?.output || null;
        if (outputs && Object.keys(outputs).length > 0) {
          setExecutionResult(record);
          tryParseAndRender(record);
          break;
        }
      } catch (e) {
        // 忽略，继续轮询
      }
      await sleep(2000);
    }
  };

  // 解析结果，生成可渲染列表
  const tryParseAndRender = (result) => {
    const items = [];
    if (!result) {
      setRenderItems(items);
      return;
    }
    const outputs = result?.outputs || result?.output || null;
    if (outputs) {
      // 遍历节点输出，搜集图像/文本等
      Object.values(outputs).forEach((nodeOut) => {
        if (!nodeOut) return;
        // 图片: { images: [{ filename, subfolder, type }] }
        if (Array.isArray(nodeOut.images)) {
          nodeOut.images.forEach((img) => {
            const url = buildViewUrl(img?.filename, img?.subfolder, img?.type);
            if (url) items.push({ kind: 'image', url });
          });
        }
        // 文本: { text: '...' } 或 { texts: [...] }
        if (typeof nodeOut.text === 'string') {
          items.push({ kind: 'text', text: nodeOut.text });
        }
        if (Array.isArray(nodeOut.texts)) {
          nodeOut.texts.forEach((t) => items.push({ kind: 'text', text: String(t) }));
        }
      });
    }
    setRenderItems(items);
  };

  const buildViewUrl = (filename, subfolder, type) => {
    if (!filename) return null;
    const u = new URL('/api/comfy/view', window.location.origin);
    u.searchParams.set('filename', filename);
    if (subfolder) u.searchParams.set('subfolder', subfolder);
    if (type) u.searchParams.set('type', type);
    return u.toString();
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

  // 基于组件+绑定的渲染（优先）
  const renderComponentControl = (comp) => {
    // 找到此组件绑定的参数路径
    const binding = Array.isArray(uiBindings) ? uiBindings.find(b => b.componentId === comp.id) : null;
    const path = binding?.bindTo;
    const value = path ? inputValues[path] : undefined;
    const errText = path ? fieldErrors[path] : undefined;

    const setVal = (v) => {
      if (!path) return;
      setInputValues((prev) => ({ ...prev, [path]: v }));
    };

    const type = comp.type;
    if (type === 'text') {
      return (
        <>
          <input
            type="text"
            className={`w-full rounded border px-3 py-2 ${errText ? 'border-red-400' : 'border-gray-300'}`}
            value={value ?? ''}
            onChange={(e) => setVal(e.target.value)}
          />
          {errText && <p className="mt-1 text-xs text-red-500">{errText}</p>}
        </>
      );
    }
    if (type === 'number' || type === 'width' || type === 'height') {
      return (
        <>
          <input
            type="number"
            className={`w-full rounded border px-3 py-2 ${errText ? 'border-red-400' : 'border-gray-300'}`}
            value={value ?? ''}
            onChange={(e) => setVal(e.target.value === '' ? '' : Number(e.target.value))}
          />
          {errText && <p className="mt-1 text-xs text-red-500">{errText}</p>}
        </>
      );
    }
    if (type === 'slider') {
      return (
        <>
          <input
            type="range"
            min={comp.properties?.min ?? 0}
            max={comp.properties?.max ?? 100}
            step={comp.properties?.step ?? 1}
            className="w-full"
            value={Number(value ?? comp.properties?.min ?? 0)}
            onChange={(e) => setVal(Number(e.target.value))}
          />
          {errText && <p className="mt-1 text-xs text-red-500">{errText}</p>}
        </>
      );
    }
    if (type === 'upload_image' || type === 'upload_multi_media' || type === 'upload_single_image' || type === 'upload_multiple_images') {
      return (
        <>
          <input
            type="file"
            accept={comp.properties?.acceptedTypes || 'image/*'}
            multiple={type === 'upload_multiple_images' || comp.properties?.multiple}
            className={`w-full text-sm ${errText ? 'border border-red-400 rounded' : ''}`}
            onChange={(e) => setVal(e.target.files?.[0] || null)}
          />
          {errText && <p className="mt-1 text-xs text-red-500">{errText}</p>}
        </>
      );
    }
    if (type === 'model_select' || type === 'dropdown' || type === 'lora_select' || type === 'sampler_select' || type === 'resolution_select') {
      // 优先使用组件自带options，否则尝试从枚举构建
      let opts = comp.properties?.options || [];
      if ((!opts || opts.length === 0) && enumsData) {
        const src = comp.properties?.optionsSource;
        if (type === 'sampler_select' || src === 'samplers') {
          opts = (enumsData.samplers || []).map(s => ({ label: s, value: s }));
        } else if (type === 'resolution_select' || src === 'resolutions') {
          opts = (enumsData.resolutions || []).map(r => ({ label: r.label, value: `${r.width}x${r.height}` }));
        }
      }
      return (
        <>
          <select
            className={`w-full rounded border px-3 py-2 ${errText ? 'border-red-400' : 'border-gray-300'}`}
            value={value ?? ''}
            onChange={(e) => setVal(e.target.value)}
          >
            <option value="">请选择...</option>
            {opts.map((o, idx) => (
              <option key={idx} value={o.value}>{o.label}</option>
            ))}
          </select>
          {errText && <p className="mt-1 text-xs text-red-500">{errText}</p>}
        </>
      );
    }
    // 默认回退为文本
    return (
      <>
        <input
          type="text"
          className={`w-full rounded border px-3 py-2 ${errText ? 'border-red-400' : 'border-gray-300'}`}
          value={value ?? ''}
          onChange={(e) => setVal(e.target.value)}
        />
        {errText && <p className="mt-1 text-xs text-red-500">{errText}</p>}
      </>
    );
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

      {/* 调试信息 */}
      <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm">
        <h4 className="font-medium text-yellow-800">调试信息:</h4>
        <p>Components 长度: {components?.length || 0}</p>
        <p>UI Bindings 长度: {Array.isArray(uiBindings) ? uiBindings.length : 'Not Array'}</p>
        <p>Params Schema 长度: {paramsSchema?.length || 0}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-yellow-700">查看 Components 详情</summary>
          <pre className="mt-2 text-xs text-yellow-600">{JSON.stringify(components, null, 2)}</pre>
        </details>
      </div>

      {/* 两栏布局：左侧组件输入，右侧结果区域 */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* 左侧：只显示页面构建器保存的组件 */}
        <aside className="md:w-80 lg:w-96 shrink-0 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">输入组件</h3>
          {Array.isArray(components) && components.length > 0 ? (
            components
              .sort((a,b) => (a.order ?? 0) - (b.order ?? 0))
              .map((comp) => {
                const binding = Array.isArray(uiBindings) ? uiBindings.find(b => b.componentId === comp.id) : null;
                const title = comp.label || comp.name || comp.type;
                const bindPath = binding?.bindTo;
                return (
                  <div key={comp.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{title}</p>
                        {bindPath && (
                          <p className="text-xs text-gray-500">绑定路径: {bindPath}</p>
                        )}
                      </div>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">{comp.type}</span>
                    </div>
                    {renderComponentControl(comp)}
                  </div>
                );
              })
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
              暂无自定义组件。请回到“页面构建器”添加组件并保存。
            </div>
          )}

          <button
            type="button"
            onClick={handleExecute}
            disabled={isExecuting || loading}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white ${
              isExecuting || loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isExecuting ? '执行中...' : '生成'}
          </button>
        </aside>

        {/* 右侧：执行结果区 */}
        <main className="flex-1 space-y-4">
          <h3 className="text-lg font-medium text-gray-900">执行结果</h3>
          {isExecuting && <div className="text-sm text-gray-500">执行中，请稍候...</div>}
          {renderItems.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {renderItems.map((it, idx) => (
                it.kind === 'image' ? (
                  <img key={idx} src={it.url} alt={`result-${idx}`} className="max-h-96 rounded border" />
                ) : (
                  <pre key={idx} className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">{it.text}</pre>
                )
              ))}
            </div>
          )}
          {executionResult && (
            <details className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
              <summary className="cursor-pointer select-none text-gray-700">原始返回数据</summary>
              <pre className="max-h-[420px] overflow-auto">{JSON.stringify(executionResult, null, 2)}</pre>
            </details>
          )}
          {!isExecuting && !executionResult && (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500">
              运行应用后将在此处显示返回结果。
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppRunner;

