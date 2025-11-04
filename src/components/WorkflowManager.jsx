import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Edit, Trash2, Play, Eye, Settings } from 'lucide-react';
import useWorkflowStore from '../store/useWorkflowStore';
import useAppBuilderStore from '../store/useAppBuilderStore';
import {
  listWorkflows,
  uploadWorkflow,
  updateWorkflow,
  deleteWorkflow,
  getWorkflow
} from '../api/index.js';

const WorkflowManager = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [file, setFile] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');

  const { uploadWorkflow: uploadWorkflowToStore, loading: uploadLoading } = useWorkflowStore();
  const { setAppId } = useAppBuilderStore();

  // 获取工作流列表
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const response = await listWorkflows();
      setWorkflows(response);
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      setError(error?.response?.data?.message || error.message || '获取工作流列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 上传工作流
  const handleUpload = async () => {
    if (!file) {
      setError('请选择文件');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', workflowName || file.name);
      formData.append('description', workflowDescription);

      const response = await uploadWorkflow(formData);
      setWorkflows(prev => [response, ...prev]);
      setShowUploadForm(false);
      setFile(null);
      setWorkflowName('');
      setWorkflowDescription('');
      setError('');
    } catch (error) {
      console.error('上传工作流失败:', error);
      setError(error?.response?.data?.message || error.message || '上传工作流失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除工作流
  const handleDelete = async (workflowId) => {
    if (window.confirm('确定要删除这个工作流吗？')) {
      try {
        await deleteWorkflow(workflowId);
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      } catch (error) {
        console.error('删除工作流失败:', error);
        setError(error?.response?.data?.message || error.message || '删除工作流失败');
      }
    }
  };

  // 创建应用
  const handleCreateApp = async (workflow) => {
    try {
      // 生成新的应用ID
      const appId = Date.now().toString();
      setAppId(appId);
      
      // 导航到应用配置页面
      navigate(`/app-builder/2?workflowId=${workflow.id}&appId=${appId}`);
    } catch (error) {
      console.error('创建应用失败:', error);
      setError(error?.response?.data?.message || error.message || '创建应用失败');
    }
  };

  // 编辑应用
  const handleEditApp = async (workflow) => {
    try {
      // 这里需要获取关联的应用ID，暂时使用工作流ID
      const appId = workflow.appId || Date.now().toString();
      setAppId(appId);
      
      // 导航到应用配置页面
      navigate(`/app-builder/2?workflowId=${workflow.id}&appId=${appId}&mode=edit`);
    } catch (error) {
      console.error('编辑应用失败:', error);
      setError(error?.response?.data?.message || error.message || '编辑应用失败');
    }
  };

  // 预览应用
  const handlePreviewApp = async (workflow) => {
    try {
      const appId = workflow.appId || Date.now().toString();
      navigate(`/app-run/${appId}?workflowId=${workflow.id}&mode=preview`);
    } catch (error) {
      console.error('预览应用失败:', error);
      setError(error?.response?.data?.message || error.message || '预览应用失败');
    }
  };

  // 文件选择处理
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const isJSON = selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json');
      if (!isJSON) {
        setError('只能上传 JSON 文件!');
        return;
      }
      
      const isLt10M = selectedFile.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        setError('文件大小不能超过 10MB!');
        return;
      }
      
      setFile(selectedFile);
      if (!workflowName) {
        setWorkflowName(selectedFile.name.replace('.json', ''));
      }
      setError('');
    }
  };

  // 拖拽处理
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const isJSON = droppedFile.type === 'application/json' || droppedFile.name.endsWith('.json');
      if (!isJSON) {
        setError('只能上传 JSON 文件!');
        return;
      }
      
      const isLt10M = droppedFile.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        setError('文件大小不能超过 10MB!');
        return;
      }
      
      setFile(droppedFile);
      if (!workflowName) {
        setWorkflowName(droppedFile.name.replace('.json', ''));
      }
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 组件挂载时获取工作流列表
  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* 头部 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">工作流管理</h2>
              <p className="text-sm text-gray-500 mt-1">管理您的 ComfyUI 工作流，创建和编辑应用</p>
            </div>
            <button
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              上传工作流
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* 上传表单 */}
          {showUploadForm && (
            <div className="mb-6 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">上传工作流文件</h3>
              
              {/* 拖拽上传区域 */}
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      点击选择或者将您的工作流文件拖拽到这里
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    *上传API格式工作流(ComfyUI界面右侧选项卡上小齿轮进入设置界面,勾选启用开发模式选项,界面将出现保存为API格式选项)
                  </p>
                </div>
              </div>

              {/* 文件信息 */}
              {file && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>已选择文件:</strong> {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                </div>
              )}

              {/* 工作流信息 */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">工作流名称</label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="请输入工作流名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">描述</label>
                  <input
                    type="text"
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="请输入工作流描述"
                  />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowUploadForm(false);
                    setFile(null);
                    setWorkflowName('');
                    setWorkflowDescription('');
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '上传中...' : '上传'}
                </button>
              </div>
            </div>
          )}

          {/* 工作流列表 */}
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            {loading && workflows.length === 0 ? (
              <div className="px-6 py-4 text-center text-gray-500">
                加载中...
              </div>
            ) : workflows.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p>暂无工作流，点击"上传工作流"开始创建</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {workflows.map((workflow) => (
                  <div key={workflow.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {workflow.name || '未命名工作流'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {workflow.description || '暂无描述'}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          创建时间: {new Date(workflow.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleDelete(workflow.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCreateApp(workflow)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        创建应用
                      </button>
                      <button
                        onClick={() => handleEditApp(workflow)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑应用
                      </button>
                    </div>

                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={() => handlePreviewApp(workflow)}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        预览
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowManager;
