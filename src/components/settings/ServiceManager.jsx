import React, { useEffect, useMemo, useState } from 'react';
import {
  listServices,
  createService,
  updateService,
  deleteService,
  setDefaultService,
  healthCheckService,
  listWorkflows,
  uploadWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflow
} from '../../api/index.js';

const defaultForm = {
  name: '',
  baseUrl: '',
  tags: '',
  authMethod: 'none',
  apiKey: '',
  apiKeyHeader: 'Authorization',
  apiKeyQuery: 'api_key',
  isDefault: false,
  enabled: true,
  timeoutMs: 60000,
  healthPath: '/prompt',
  rps: 0,
};

const ServiceForm = ({ initial, onSubmit, onCancel }) => {
  const [form, setForm] = useState({ ...defaultForm, ...(initial || {}) });
  const editing = !!initial?.id;

  const submit = async (e) => {
    e.preventDefault();
    let payload = {
      ...form,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : (form.tags || []),
    };
    
    // 根据鉴权方式过滤不需要的字段
    if (form.authMethod === 'none') {
      // 无鉴权模式下，删除鉴权相关字段
      delete payload.apiKey;
      delete payload.apiKeyHeader;
      delete payload.apiKeyQuery;
    } else if (form.authMethod === 'header') {
      // Header鉴权模式下，删除Query相关字段
      delete payload.apiKeyQuery;
    } else if (form.authMethod === 'query') {
      // Query鉴权模式下，删除Header相关字段
      delete payload.apiKeyHeader;
    }
    
    // 处理API密钥逻辑
    if (editing) {
      if (!form.apiKey) {
        // 编辑模式下，如果API密钥为空则删除该字段（保持原有值）
        delete payload.apiKey;
      } else if (form.apiKey === '__clear__') {
        // 特殊标记用于清除API密钥
        payload.apiKey = '';
      }
    }
    
    await onSubmit(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">名称</label>
          <input className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
        </div>
        <div>
          <label className="text-xs text-gray-500">Base URL</label>
          <input className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.baseUrl} onChange={e=>setForm(f=>({...f,baseUrl:e.target.value}))} required placeholder="https://host:port" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">鉴权方式</label>
          <select className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.authMethod} onChange={e=>setForm(f=>({...f,authMethod:e.target.value}))}>
            <option value="none">none</option>
            <option value="header">header</option>
            <option value="query">query</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">标签(逗号分隔)</label>
          <input className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={typeof form.tags==='string'?form.tags:form.tags?.join(',')||''} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
        </div>
      </div>
      {form.authMethod !== 'none' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500">密钥{editing? ' (留空=不变)': ''}</label>
            <input type="password" className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.apiKey} onChange={e=>setForm(f=>({...f,apiKey:e.target.value}))} placeholder={editing? '******' : ''} />
            {editing && form.apiKey && (
              <div className="text-xs text-gray-500 mt-1">
                <label className="inline-flex items-center">
                  <input 
                    type="checkbox" 
                    className="mr-1" 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm(f => ({...f, apiKey: '__clear__'}));
                      } else {
                        setForm(f => ({...f, apiKey: ''}));
                      }
                    }} 
                  />
                  清除现有密钥
                </label>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500">{form.authMethod==='header'?'Header 名称':'Query Key'}</label>
            <input className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.authMethod==='header'?form.apiKeyHeader:form.apiKeyQuery} onChange={e=>setForm(f=>form.authMethod==='header'?{...f,apiKeyHeader:e.target.value}:{...f,apiKeyQuery:e.target.value})} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500">超时(ms)</label>
          <input type="number" className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.timeoutMs} onChange={e=>setForm(f=>({...f,timeoutMs:Number(e.target.value)}))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">健康检查路径</label>
          <input className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.healthPath} onChange={e=>setForm(f=>({...f,healthPath:e.target.value}))} />
        </div>
        <div>
          <label className="text-xs text-gray-500">启用</label>
          <select className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" value={form.enabled? '1':'0'} onChange={e=>setForm(f=>({...f,enabled:e.target.value==='1'}))}>
            <option value="1">是</option>
            <option value="0">否</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="inline-flex items-center space-x-2 text-xs"><input type="checkbox" checked={form.isDefault} onChange={e=>setForm(f=>({...f,isDefault:e.target.checked}))} /><span>设为默认</span></label>
        <div className="space-x-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 text-xs border rounded">取消</button>
          <button type="submit" className="px-3 py-1 text-xs bg-primary-500 text-white rounded">保存</button>
        </div>
      </div>
    </form>
  );
};

// 添加工作流编辑表单组件
const WorkflowForm = ({ initial, onSubmit, onCancel }) => {
  const [form, setForm] = useState({ 
    name: initial?.name || '',
    data: initial?.data || {}
  });
  const editing = !!initial?.id;

  const submit = async (e) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="text-xs text-gray-500">工作流名称</label>
        <input 
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" 
          value={form.name} 
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
          required 
        />
      </div>
      
      <div>
        <label className="text-xs text-gray-500">工作流数据 (JSON)</label>
        <textarea
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500 font-mono"
          value={typeof form.data === 'string' ? form.data : JSON.stringify(form.data, null, 2)}
          onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value);
              setForm(f => ({ ...f, data: parsed }));
            } catch {
              // 如果不是有效的JSON，保持为字符串
              setForm(f => ({ ...f, data: e.target.value }));
            }
          }}
          rows={10}
          placeholder="工作流JSON数据"
        />
      </div>
      
      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-gray-500">
          {editing ? `ID: ${initial.id}` : '新建工作流'}
        </div>
        <div className="space-x-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 text-xs border rounded">取消</button>
          <button type="submit" className="px-3 py-1 text-xs bg-primary-500 text-white rounded">保存</button>
        </div>
      </div>
    </form>
  );
};

// 添加工作流管理组件
const WorkflowManager = ({ workflows, onRefresh, onUpload, onDelete, onEdit }) => {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/json') {
      setFile(selectedFile);
    } else {
      alert('请选择JSON格式的工作流文件');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await onUpload(formData);
      setFile(null);
      onRefresh();
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (workflow) => {
    try {
      // 获取完整的工作流数据
      const fullWorkflow = await getWorkflow(workflow.id);
      setEditingWorkflow(fullWorkflow);
    } catch (error) {
      console.error('获取工作流详情失败:', error);
      alert('获取工作流详情失败: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUpdate = async (payload) => {
    try {
      await updateWorkflow(editingWorkflow.id, payload);
      setEditingWorkflow(null);
      onRefresh();
    } catch (error) {
      console.error('更新失败:', error);
      alert('更新失败: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="space-y-3">
      {editingWorkflow ? (
        <WorkflowForm 
          initial={editingWorkflow} 
          onSubmit={handleUpdate} 
          onCancel={() => setEditingWorkflow(null)} 
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">工作流管理</h4>
            <div className="flex items-center space-x-2">
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                className="text-xs" 
                disabled={uploading}
              />
              <button 
                onClick={handleUpload} 
                disabled={!file || uploading}
                className="px-2 py-1 text-xs bg-primary-500 text-white rounded disabled:opacity-50"
              >
                {uploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
          
          <div className="border rounded">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="py-2 px-2">名称</th>
                  <th>类型</th>
                  <th>最后修改</th>
                  <th className="text-right pr-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map(w => (
                  <tr key={w.id} className="border-t">
                    <td className="py-2 px-2">{w.name}</td>
                    <td>{w.type === 'builtin' ? '内置' : '自定义'}</td>
                    <td>{w.lastModified}</td>
                    <td className="text-right pr-2 space-x-2">
                      {w.type === 'custom' && (
                        <button 
                          onClick={() => handleEdit(w)}
                          className="text-blue-600 underline text-xs"
                        >
                          编辑
                        </button>
                      )}
                      {w.type === 'custom' && (
                        <button 
                          onClick={() => onDelete(w.id)}
                          className="text-red-600 underline text-xs"
                        >
                          删除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const ServiceManager = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'workflows'

  const refreshServices = async () => {
    setLoading(true);
    try {
      const list = await listServices();
      setServices(list);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshWorkflows = async () => {
    setLoading(true);
    try {
      const list = await listWorkflows();
      setWorkflows(list);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (open) {
      if (activeTab === 'services') {
        refreshServices();
      } else {
        refreshWorkflows();
      }
    }
  }, [open, activeTab]);

  if (!open) return null;

  const onCreate = async (payload) => { await createService(payload); setCreating(false); await refreshServices(); };
  const onUpdate = async (payload) => { await updateService(editing.id, payload); setEditing(null); await refreshServices(); };

  const handleUploadWorkflow = async (formData) => {
    await uploadWorkflow(formData);
  };

  const handleDeleteWorkflow = async (id) => {
    if (window.confirm('确定要删除这个工作流吗？')) {
      try {
        await deleteWorkflow(id);
        await refreshWorkflows();
      } catch (error) {
        alert('删除失败: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
      <div className="bg-white w-[800px] max-h-[80vh] rounded shadow-lg p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">AI 服务管理</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-sm">关闭</button>
        </div>
        
        {/* 标签页 */}
        <div className="flex border-b border-gray-200 mb-3">
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'services' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
            onClick={() => {
              setActiveTab('services');
              refreshServices();
            }}
          >
            服务管理
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'workflows' ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500'}`}
            onClick={() => {
              setActiveTab('workflows');
              refreshWorkflows();
            }}
          >
            工作流管理
          </button>
        </div>

        {activeTab === 'services' ? (
          (creating || editing) ? (
            <ServiceForm initial={editing} onSubmit={editing ? onUpdate : onCreate} onCancel={() => { setCreating(false); setEditing(null); }} />
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-gray-500">共 {services.length} 项</div>
                <button onClick={() => setCreating(true)} className="px-2 py-1 text-xs bg-primary-500 text-white rounded">新增服务</button>
              </div>
              {loading ? (
                <div className="text-xs text-gray-500">加载中...</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">名称</th>
                      <th>Base URL</th>
                      <th>鉴权</th>
                      <th>默认</th>
                      <th>启用</th>
                      <th>健康</th>
                      <th>最后检查</th>
                      <th className="text-right pr-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => (
                      <tr key={s.id} className="border-t">
                        <td className="py-2">{s.name}</td>
                        <td className="truncate max-w-[180px]" title={s.baseUrl}>{s.baseUrl}</td>
                        <td>{s.authMethod}</td>
                        <td>{s.isDefault? '是':'否'}</td>
                        <td>{s.enabled? '是':'否'}</td>
                        <td className={s.healthStatus==='healthy'?'text-green-600':(s.healthStatus==='unhealthy'?'text-red-600':'text-gray-500')}>{s.healthStatus}</td>
                        <td>{s.lastHealthCheckAt? new Date(s.lastHealthCheckAt).toLocaleString(): '-'}</td>
                        <td className="text-right space-x-2 pr-2">
                          <button onClick={() => setEditing(s)} className="underline">编辑</button>
                          <button onClick={async ()=>{ await healthCheckService(s.id); await refreshServices(); }} className="underline">健康检查</button>
                          <button onClick={async ()=>{ await setDefaultService(s.id); await refreshServices(); }} className="underline">设默认</button>
                          <button onClick={async ()=>{ await deleteService(s.id); await refreshServices(); }} className="underline text-red-600">删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
            </div>
          )
        ) : (
          // 工作流管理界面
          <div className="flex-1 overflow-auto">
            <WorkflowManager 
              workflows={workflows} 
              onRefresh={refreshWorkflows}
              onUpload={handleUploadWorkflow}
              onDelete={handleDeleteWorkflow}
              onEdit={() => {}} // 空函数，实际在WorkflowManager内部处理
            />
            {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceManager;