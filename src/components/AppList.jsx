import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Play, Eye, Settings, Upload, ChevronDown, MoreVertical, Filter, Copy } from 'lucide-react';
import {
  listApps,
  deleteApp,
  listWorkflows
} from '../api/index.js';

const AppList = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [sortBy, setSortBy] = useState('更新时间(近->远)');
  const [appType, setAppType] = useState('公共应用');
  const loadedRef = useRef(false); // 防止开发环境StrictMode重复触发

  // 获取应用列表
  const fetchApps = async () => {
    try {
      setLoading(true);
      const response = await listApps();
      setApps(response);
    } catch (error) {
      console.error('获取应用列表失败:', error);
      setError(error?.response?.data?.message || error.message || '获取应用列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取工作流列表
  const fetchWorkflows = async () => {
    try {
      const response = await listWorkflows();
      setWorkflows(response);
    } catch (error) {
      console.error('获取工作流列表失败:', error);
    }
  };

  // 删除应用
  const handleDeleteApp = async (appId) => {
    if (window.confirm('确定要删除这个应用吗？')) {
      try {
        await deleteApp(appId);
        setApps(prev => prev.filter(app => app.id !== appId));
      } catch (error) {
        console.error('删除应用失败:', error);
        setError(error?.response?.data?.message || error.message || '删除应用失败');
      }
    }
  };

  // 复制应用
  const handleCloneApp = async (app) => {
    try {
      const resp = await fetch(`/api/apps/${app.id}/clone`, { method: 'POST' });
      const result = await resp.json();
      if (result?.success && result?.data) {
        setApps(prev => [result.data, ...prev]);
      }
    } catch (error) {
      console.error('复制应用失败:', error);
      setError(error?.response?.data?.message || error.message || '复制应用失败');
    }
  };

  // 创建新应用
  const handleCreateApp = () => {
    navigate('/app-builder/2'); // 跳转到上传工作流页面
  };

  // 编辑应用 - 直接进入页面构建器
  const handleEditApp = (app) => {
    navigate(`/app-builder/4?appId=${app.id}&mode=edit`);
  };

  // 运行应用
  const handleRunApp = (app) => {
    navigate(`/app-run/${app.id}`);
  };

  // 预览应用
  const handlePreviewApp = (app) => {
    navigate(`/app-run/${app.id}?mode=preview`);
  };

  // 从工作流创建应用
  const handleCreateFromWorkflow = (workflow) => {
    navigate(`/app-builder/3?workflowId=${workflow.id}`);
  };

  // 分类选项
  const categories = [
    '全部', '局部重绘', '高清放大', '图片填充', '增加细节', 
    '图片重塑', '文生图', '文字修图', '表情调整', '抠图', '图生文', '万物迁移'
  ];

  // 排序选项
  const sortOptions = [
    '更新时间(近->远)',
    '更新时间(远->近)',
    '创建时间(近->远)',
    '创建时间(远->近)',
    '名称(A->Z)',
    '名称(Z->A)'
  ];

  // 应用类型选项
  const appTypes = ['公共应用', '私有应用', '我的应用'];

  // 过滤和排序应用
  const filteredAndSortedApps = () => {
    let filtered = apps;

    // 按分类过滤
    if (selectedCategory !== '全部') {
      filtered = filtered.filter(app => 
        app.category === selectedCategory || 
        app.tags?.includes(selectedCategory)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case '更新时间(近->远)':
          return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        case '更新时间(远->近)':
          return new Date(a.updatedAt || a.createdAt) - new Date(b.updatedAt || b.createdAt);
        case '创建时间(近->远)':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case '创建时间(远->近)':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case '名称(A->Z)':
          return (a.name || '').localeCompare(b.name || '');
        case '名称(Z->A)':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  // 组件挂载时获取数据
  useEffect(() => {
    if (loadedRef.current) return; // 避免重复请求导致后端429
    loadedRef.current = true;
    fetchApps();
    fetchWorkflows();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部筛选栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* 应用类型选择器 */}
            <div className="relative">
              <select
                value={appType}
                onChange={(e) => setAppType(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {appTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* 排序方式选择器 */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {sortOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCreateApp}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增应用
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              应用商店
            </button>
          </div>
        </div>
      </div>

      {/* 分类标签栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex space-x-1 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 应用网格 */}
        {loading && apps.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : filteredAndSortedApps().length === 0 ? (
          <div className="text-center py-12">
            <Plus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">暂无应用</p>
            <p className="text-gray-500 mb-4">点击"新增应用"开始创建您的第一个AI应用</p>
            <button
              onClick={handleCreateApp}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              新增应用
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredAndSortedApps().map((app) => (
              <div key={(app.id || app._id || `${app.name}-${app.createdAt || ''}`)} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {/* 应用预览图 */}
                <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                  {app.previewImage ? (
                    <img
                      src={app.previewImage}
                      alt={app.name}
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <Settings className="w-6 h-6 text-blue-600" />
                        </div>
                        <p className="text-xs text-gray-500">AI应用</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 应用信息 */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate" title={app.name}>
                        {app.name || '未命名应用'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 truncate" title={app.title}>
                        {app.title || app.description || '暂无描述'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      <button
                        onClick={() => handlePreviewApp(app)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCloneApp(app)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="复制"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 应用详情 */}
                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>功能描述:</span>
                      <span className="text-gray-400">-</span>
                    </div>
                    <div className="flex justify-between">
                      <span>算力消耗:</span>
                      <span>{app.computeCost || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>版本:</span>
                      <span>V{app.workflowVersion || 1}.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>排序:</span>
                      <span>{app.sortOrder || '999'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>最近更新:</span>
                      <span>{new Date(app.updatedAt || app.createdAt).toLocaleString('zh-CN', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => handleEditApp(app)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleRunApp(app)}
                      className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      运行
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 工作流快速创建区域 */}
        {workflows.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">从现有工作流快速创建应用</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {workflows.slice(0, 4).map((workflow) => (
                <div key={workflow.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {workflow.name || '未命名工作流'}
                    </h4>
                    <button
                      onClick={() => handleCreateFromWorkflow(workflow)}
                      className="text-blue-600 hover:text-blue-800 text-xs"
                    >
                      创建应用
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {workflow.description || '暂无描述'}
                  </p>
                </div>
              ))}
            </div>
            {workflows.length > 4 && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => navigate('/app-builder/2')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  查看更多工作流...
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppList;