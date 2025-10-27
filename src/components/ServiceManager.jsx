import React, { useState, useEffect } from 'react';
import api from '@/api/index.js';
import { useNavigate } from 'react-router-dom'; // 添加useNavigate导入

const ServiceManager = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
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

  const navigate = useNavigate(); // 添加useNavigate钩子

  // 获取服务列表
  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/services');
      setServices(response.data.data || []);
    } catch (error) {
      console.error('获取服务列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取模型列表
  const fetchModels = async (serviceId) => {
    try {
      // 这里应该调用获取模型的API
      // 暂时返回模拟数据
      return [
        { id: 'model1', name: 'Stable Diffusion 1.5' },
        { id: 'model2', name: 'Stable Diffusion 2.1' },
        { id: 'model3', name: 'Anime Style Model' }
      ];
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // 处理表单输入变化
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 提交表单
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingService) {
        // 更新服务
        await api.put(`/services/${editingService.id}`, formData);
      } else {
        // 创建服务
        await api.post('/services', formData);
      }
      setShowForm(false);
      setEditingService(null);
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
    } finally {
      setLoading(false);
    }
  };

  // 编辑服务
  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      baseUrl: service.baseUrl,
      authMethod: service.authMethod,
      apiKey: '',
      apiKeyHeader: service.apiKeyHeader || 'Authorization',
      apiKeyQuery: service.apiKeyQuery || 'api_key',
      isDefault: service.isDefault,
      enabled: service.enabled,
      timeoutMs: service.timeoutMs || 60000,
      healthPath: service.healthPath || '/prompt'
    });
    setShowForm(true);
  };

  // 删除服务
  const handleDelete = async (serviceId) => {
    // 检测服务是否被任务或用户绑定
    try {
      // 这里应该调用API检测服务绑定状态
      // 暂时使用模拟检测
      const isBound = false; // 实际实现中应该从后端获取
      
      if (isBound) {
        alert('该服务已被任务或用户绑定，无法删除');
        return;
      }
      
      if (window.confirm('确定要删除这个服务吗？')) {
        try {
          await api.delete(`/services/${serviceId}`);
          fetchServices();
        } catch (error) {
          console.error('删除服务失败:', error);
        }
      }
    } catch (error) {
      console.error('检测服务绑定状态失败:', error);
      // 即使检测失败，也允许用户确认是否删除
      if (window.confirm('确定要删除这个服务吗？')) {
        try {
          await api.delete(`/services/${serviceId}`);
          fetchServices();
        } catch (error) {
          console.error('删除服务失败:', error);
        }
      }
    }
  };

  // 设置默认服务
  const handleSetDefault = async (serviceId) => {
    try {
      await api.post(`/services/${serviceId}/set-default`);
      fetchServices();
    } catch (error) {
      console.error('设置默认服务失败:', error);
      alert('设置默认服务失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // 健康检查
  const handleHealthCheck = async (serviceId) => {
    try {
      await api.post(`/services/${serviceId}/health-check`);
      fetchServices();
    } catch (error) {
      console.error('健康检查失败:', error);
      alert('健康检查失败: ' + (error.response?.data?.message || error.message));
    }
  };

  // 导航到工作流上传页面
  const handleNavigateToWorkflow = () => {
    // 在AppBuilder中，步骤1是上传工作流
    navigate('/app-builder/1');
  };

  // 取消编辑
  const handleCancel = () => {
    setShowForm(false);
    setEditingService(null);
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI服务管理</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            添加服务
          </button>
          {services.length > 0 && (
            <button
              onClick={handleNavigateToWorkflow}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              上传工作流
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingService ? '编辑服务' : '添加服务'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">服务名称</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">基础URL</label>
                <input
                  type="url"
                  name="baseUrl"
                  value={formData.baseUrl}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">认证方式</label>
                <select
                  name="authMethod"
                  value={formData.authMethod}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">无认证</option>
                  <option value="header">Header认证</option>
                  <option value="query">Query认证</option>
                </select>
              </div>
              {formData.authMethod !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {formData.authMethod === 'header' ? 'API Key Header' : 'API Key Query参数'}
                  </label>
                  <input
                    type="text"
                    name={formData.authMethod === 'header' ? 'apiKeyHeader' : 'apiKeyQuery'}
                    value={formData.authMethod === 'header' ? formData.apiKeyHeader : formData.apiKeyQuery}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              {formData.authMethod !== 'none' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <input
                    type="password"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">超时时间(ms)</label>
                <input
                  type="number"
                  name="timeoutMs"
                  value={formData.timeoutMs}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">健康检查路径</label>
                <input
                  type="text"
                  name="healthPath"
                  value={formData.healthPath}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                id="enabled"
                name="enabled"
                type="checkbox"
                checked={formData.enabled}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                启用服务
              </label>
              <input
                id="isDefault"
                name="isDefault"
                type="checkbox"
                checked={formData.isDefault}
                onChange={handleInputChange}
                className="ml-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
                设为默认服务
              </label>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">服务列表</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  服务名称
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  默认
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后修改人
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{service.baseUrl}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      service.healthStatus === 'healthy' 
                        ? 'bg-green-100 text-green-800' 
                        : service.healthStatus === 'unhealthy' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {service.healthStatus === 'healthy' ? '健康' : 
                       service.healthStatus === 'unhealthy' ? '不健康' : '未知'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {service.isDefault ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        默认
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        -
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {service.createdAt ? new Date(service.createdAt).toLocaleString() : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {service.updatedBy || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleHealthCheck(service.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        检查
                      </button>
                      <button
                        onClick={() => handleEdit(service)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        编辑
                      </button>
                      {!service.isDefault && (
                        <button
                          onClick={() => handleSetDefault(service.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          设为默认
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
              ))}
            </tbody>
          </table>
        </div>
        {services.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">暂无服务，请添加第一个服务</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceManager;
