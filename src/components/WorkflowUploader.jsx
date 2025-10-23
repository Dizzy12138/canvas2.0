import React, { useState } from 'react';
import useWorkflowStore from '../store/useWorkflowStore';

const WorkflowUploader = ({ onNext }) => {
  const [file, setFile] = useState(null);
  const { uploadWorkflow, loading, error, workflow } = useWorkflowStore();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const isJSON = selectedFile.type === 'application/json' || selectedFile.name.endsWith('.json');
      if (!isJSON) {
        useWorkflowStore.setState({ error: '只能上传 JSON 文件!' });
        return;
      }
      
      const isLt10M = selectedFile.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        useWorkflowStore.setState({ error: '文件大小不能超过 10MB!' });
        return;
      }
      
      setFile(selectedFile);
      useWorkflowStore.setState({ error: null });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const isJSON = droppedFile.type === 'application/json' || droppedFile.name.endsWith('.json');
      if (!isJSON) {
        useWorkflowStore.setState({ error: '只能上传 JSON 文件!' });
        return;
      }
      
      const isLt10M = droppedFile.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        useWorkflowStore.setState({ error: '文件大小不能超过 10MB!' });
        return;
      }
      
      setFile(droppedFile);
      useWorkflowStore.setState({ error: null });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      useWorkflowStore.setState({ error: '请先选择文件' });
      return;
    }
    try {
      const uploadedWorkflow = await uploadWorkflow(file);
      if (uploadedWorkflow && onNext) {
        onNext(uploadedWorkflow.workflowId);
      }
    } catch (err) {
      // 错误已在 store 中处理，此处无需额外逻辑
    }
  };

  const handleRemove = () => {
    setFile(null);
    useWorkflowStore.getState().clearWorkflow();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-4">上传工作流</h3>
      <p className="text-sm text-gray-500 mb-6">请上传 ComfyUI API 格式的 JSON 工作流文件</p>
      
      <div className="mb-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            workflow 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-blue-50'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center">
            {workflow ? (
              <>
                <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p className="text-lg font-medium text-green-700">{file?.name}</p>
                <p className="text-sm text-green-600">文件上传成功</p>
                <p className="text-sm text-blue-600 mt-2">
                  检测到 {workflow.nodesTree?.length || 0} 个节点
                </p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p className="text-lg font-medium text-gray-700">
                  {file ? file.name : '点击或拖拽文件到此区域上传'}
                </p>
                <p className="text-sm text-gray-500">仅支持 .json 文件，大小不超过 10MB</p>
              </>
            )}
          </div>
        </div>
        
        {file && !workflow && (
          <div className="mt-2 flex justify-center">
            <button
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-800"
            >
              移除文件
            </button>
          </div>
        )}
        
        {error && (
          <div className="mt-3 text-sm text-red-600">
            错误: {error}
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={workflow ? () => onNext(workflow.workflow_id) : handleUpload} 
          disabled={!file || loading}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            !file || loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {workflow ? '处理中...' : '解析中...'}
            </>
          ) : workflow ? (
            '下一步'
          ) : (
            '解析工作流'
          )}
        </button>
      </div>
    </div>
  );
};

export default WorkflowUploader;

