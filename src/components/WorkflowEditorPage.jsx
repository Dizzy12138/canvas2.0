import React, { useState, useEffect } from 'react';
import WorkflowDesigner from './WorkflowDesigner.jsx';
import { getWorkflow, listWorkflows } from '../api/index.js';

const WorkflowEditorPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [workflowParams, setWorkflowParams] = useState({});
  const [loading, setLoading] = useState(false);

  // 加载工作流列表
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const list = await listWorkflows();
      setWorkflows(list);
      if (list.length > 0) {
        handleWorkflowSelect(list[0].id);
      }
    } catch (error) {
      console.error('加载工作流列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowSelect = async (workflowId) => {
    setLoading(true);
    try {
      const data = await getWorkflow(workflowId);
      setWorkflowData(data);
      setSelectedWorkflow(workflowId);
      
      // 初始化参数
      if (data.data && data.data.parameters) {
        const initialParams = {};
        Object.keys(data.data.parameters).forEach(key => {
          initialParams[key] = data.data.parameters[key].default;
        });
        setWorkflowParams(initialParams);
      }
    } catch (error) {
      console.error('加载工作流详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleParameterChange = (params) => {
    setWorkflowParams(params);
  };

  const handleSaveWorkflow = () => {
    console.log('保存工作流:', workflowData, workflowParams);
    // 这里实现保存逻辑
  };

  const handleLoadWorkflow = () => {
    console.log('加载工作流');
    // 这里实现加载逻辑
  };

  const handleGenerate = () => {
    console.log('生成图像:', workflowParams);
    // 这里实现生成逻辑
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">ComfyUI 工作流设计器</h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedWorkflow || ''}
              onChange={(e) => handleWorkflowSelect(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={loading}
            >
              <option value="">选择工作流</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name} ({workflow.type === 'builtin' ? '内置' : '自定义'})
                </option>
              ))}
            </select>
            <button
              onClick={loadWorkflows}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              {loading ? '加载中...' : '刷新'}
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        {loading && !workflowData ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : (
          <WorkflowDesigner
            workflowData={workflowData}
            onParameterChange={handleParameterChange}
            onSaveWorkflow={handleSaveWorkflow}
            onLoadWorkflow={handleLoadWorkflow}
            onGenerate={handleGenerate}
          />
        )}
      </div>
    </div>
  );
};

export default WorkflowEditorPage;