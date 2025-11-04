import React, { useEffect, useState } from 'react';
import {
  listServices,
  createService,
  updateService,
  deleteService,
  setDefaultService,
  healthCheckService,
} from '../api/index.js';

const ServiceManagerStandalone = () => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    authMethod: 'none',
    apiKey: '',
    apiKeyHeader: 'Authorization',
    apiKeyQuery: 'api_key',
    isDefault: false,
    enabled: true,
    timeoutMs: 60000,
    healthPath: '/prompt'
  });

  // 获取服务列表
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await listServices();
      setServices(response);
    } catch (error) {
      console.error('获取服务列表失败:', error);
      setError(error?.response?.data?.message || error.message || '获取服务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存服务
  const handleSave = async () => {
    try {
      setLoading(true);
      if (editing) {
        // 更新服务
        await updateService(editing.id, formData);
      } else {
        // 创建服务
        await createService(formData);
      }
      setCreating(false);
      setEditing(null);
      setFormData({
        name: '',
        baseUrl: '',
        authMethod: 'none',
        apiKey: '',
        apiKeyHeader: 'Authorization',
        apiKeyQuery: 'api_key',
        isDefault: false,
        enabled: true,
        timeoutMs: 60000,
        healthPath: '/prompt'
      });
      fetchServices();
    } catch (error) {
      console.error('保存服务失败:', error);
      setError(error?.response?.data?.message || error.message || '保存服务失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除服务
  const handleDelete = async (serviceId) => {
    try {
      if (window.confirm('确定要删除这个服务吗？')) {
        await deleteService(serviceId);
        fetchServices();
      }
    } catch (error) {
      console.error('删除服务失败:', error);
      setError(error?.response?.data?.message || error.message || '删除服务失败');
    }
  };

  // 设置默认服务
  const handleSetDefault = async (serviceId) => {
    try {
      await setDefaultService(serviceId);
      fetchServices();
    } catch (error) {
      console.error('设置默认服务失败:', error);
      setError(error?.response?.data?.message || error.message || '设置默认服务失败');
    }
  };

  // 健康检查
  const handleHealthCheck = async (serviceId) => {
    try {
      await healthCheckService(serviceId);
      fetchServices();
    } catch (error) {
      console.error('健康检查失败:', error);
      setError(error?.response?.data?.message || error.message || '健康检查失败');
    }
  };

  // 编辑服务
  const handleEdit = (service) => {
    setEditing(service);
    setFormData({
      name: service.name,
      baseUrl: service.baseUrl,
      authMethod: service.authMethod,
      apiKey: service.apiKey || '',
      apiKeyHeader: service.apiKeyHeader || 'Authorization',
      apiKeyQuery: service.apiKeyQuery || 'api_key',
      isDefault: service.isDefault,
      enabled: service.enabled,
      timeoutMs: service.timeoutMs,
      healthPath: service.healthPath
    });
    setCreating(true);
    setShowForm(true);
  };

  // 取消编辑
  const handleCancel = () => {
    setEditing(null);
    setCreating(false);
    setShowForm(false);
    setFormData({
      name: '',
      baseUrl: '',
      authMethod: 'none',
      apiKey: '',
      apiKeyHeader: 'Authorization',
      apiKeyQuery: 'api_key',
      isDefault: false,
      enabled: true,
      timeoutMs: 60000,
      healthPath: '/prompt'
    });
  };

  // 组件挂载时获取服务列表
  useEffect(() => {
    fetchServices();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">服务管理</h2>
            <button
              onClick={() => {
                setCreating(true);
                setShowForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              添加服务
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 服务表单 */}
          {(creating || showForm) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editing ? '编辑服务' : '添加服务'}
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">服务名称</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">基础URL</label>
                    <input
                      type="url"
                      value={formData.baseUrl}
                      onChange={(e) => setFormData({...formData, baseUrl: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">鉴权方式</label>
                    <select
                      value={formData.authMethod}
                      onChange={(e) => setFormData({...formData, authMethod: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="none">无鉴权</option>
                      <option value="header">Header鉴权</option>
                      <option value="query">Query鉴权</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">超时时间(毫秒)</label>
                    <input
                      type="number"
                      value={formData.timeoutMs}
                      onChange={(e) => setFormData({...formData, timeoutMs: parseInt(e.target.value)})}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                {formData.authMethod !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">API密钥</label>
                      <input
                        type="password"
                        value={formData.apiKey}
                        onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        {formData.authMethod === 'header' ? 'Header名称' : 'Query参数名'}
                      </label>
                      <input
                        type="text"
                        value={formData.authMethod === 'header' ? formData.apiKeyHeader : formData.apiKeyQuery}
                        onChange={(e) => setFormData({
                          ...formData, 
                          [formData.authMethod === 'header' ? 'apiKeyHeader' : 'apiKeyQuery']: e.target.value
                        })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({...formData, isDefault: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                      设为默认服务
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                      启用服务
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? '保存中...' : (editing ? '更新' : '创建')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 服务列表 */}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">鉴权</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">默认</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">健康状态</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : services.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      暂无服务
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs" title={service.baseUrl}>
                        {service.baseUrl}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.authMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.isDefault ? '是' : '否'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.enabled ? '启用' : '禁用'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          service.healthStatus === 'healthy' 
                            ? 'bg-green-100 text-green-800' 
                            : service.healthStatus === 'unhealthy'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {service.healthStatus || '未知'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleHealthCheck(service.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            健康检查
                          </button>
                          {!service.isDefault && (
                            <button
                              onClick={() => handleSetDefault(service.id)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              设默认
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceManagerStandalone;
