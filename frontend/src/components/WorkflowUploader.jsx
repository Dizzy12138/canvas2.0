import React, { useState } from 'react';
import axios from 'axios';
import WorkflowParameterManager from '@frontend/components/WorkflowParameterManager';

const WorkflowUploader = ({ onNext }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  const [workflowParams, setWorkflowParams] = useState({});
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'parameters'

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
      setError('');
    }
  };

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
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) {
      setError('请先选择文件');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/apps/workflows/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setParsedData(response.data);
      
      // 如果有参数，切换到参数配置标签
      if (response.data && response.data.parameters) {
        setActiveTab('parameters');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || '解析失败，请检查文件格式';
      setError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setError('');
    setParsedData(null);
    setActiveTab('upload');
  };

  const handleParametersChange = (params) => {
    setWorkflowParams(params);
  };

  const handleNext = () => {
    if (parsedData) {
      // 将参数添加到解析的数据中
      const dataWithParams = {
        ...parsedData,
        workflowParams: workflowParams
      };
      onNext(dataWithParams);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-lg font-medium text-gray-900 mb-4">上传工作流</h3>
      <p className="text-sm text-gray-500 mb-6">请上传 ComfyUI API 格式的 JSON 工作流文件</p>
      
      {/* 标签页 */}
      {parsedData && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'upload' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('upload')}
          >
            工作流文件
          </button>
          {parsedData.parameters && (
            <button
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'parameters' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('parameters')}
            >
              参数配置
            </button>
          )}
        </div>
      )}
      
      {/* 上传区域 */}
      {activeTab === 'upload' && (
        <div className="mb-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              parsedData 
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
              {parsedData ? (
                <>
                  <svg className="w-12 h-12 text-green-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-lg font-medium text-green-700">{file?.name}</p>
                  <p className="text-sm text-green-600">文件上传成功</p>
                  {parsedData.parameters && (
                    <p className="text-sm text-blue-600 mt-2">
                      检测到 {Object.keys(parsedData.parameters).length} 个可配置参数
                    </p>
                  )}
                  {parsedData.nodesCount && (
                    <p className="text-sm text-blue-600 mt-1">
                      包含 {parsedData.nodesCount} 个节点
                    </p>
                  )}
                  {parsedData.outputNodes && (
                    <p className="text-sm text-blue-600 mt-1">
                      识别到 {parsedData.outputNodes.length} 个可输出节点
                    </p>
                  )}
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
          
          {file && !parsedData && (
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
      )}
      
      {/* 解析结果展示区域 */}
      {activeTab === 'upload' && parsedData && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-3">解析结果</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-500">节点总数</div>
              <div className="text-lg font-bold text-gray-900">{parsedData.nodesCount}</div>
            </div>
            <div className="bg-white p-3 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-500">可配置参数</div>
              <div className="text-lg font-bold text-gray-900">{parsedData.parameters ? Object.keys(parsedData.parameters).length : 0}</div>
            </div>
            <div className="bg-white p-3 rounded border border-gray-200">
              <div className="text-sm font-medium text-gray-500">可输出节点</div>
              <div className="text-lg font-bold text-gray-900">{parsedData.outputNodes ? parsedData.outputNodes.length : 0}</div>
            </div>
          </div>
                    
          {parsedData.outputNodes && parsedData.outputNodes.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">可输出节点列表</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {parsedData.outputNodes.map((node, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{node.title || node.type}</div>
                      <div className="text-xs text-gray-500">ID: {node.id} | 类型: {node.type}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {node.outputs.map((output, i) => (
                        <span key={i} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-1">
                          {output.port} ({output.type})
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
                    
          {parsedData.mappableInputs && parsedData.mappableInputs.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">可配置输入参数</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {parsedData.mappableInputs.map((input, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{input.nodeTitle}</div>
                      <div className="text-xs text-gray-500">端口: {input.port} | 类型: {input.type}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {input.required ? '必填' : '可选'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
                
      {/* 参数配置区域 */}
      {activeTab === 'parameters' && parsedData && (
        <div className="mb-6">
          <WorkflowParameterManager 
            workflowData={parsedData}
            onParametersChange={handleParametersChange}
          />
        </div>
      )}
      
      <div className="flex justify-between gap-3">
        <button
          disabled
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
        >
          上一步
        </button>
        <div className="flex gap-3">
          {parsedData && (
            <button
              onClick={handleRemove}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              重新上传
            </button>
          )}
          <button 
            onClick={parsedData ? handleNext : handleUpload} 
            disabled={!file || uploading}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              !file || uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {uploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {parsedData ? '处理中...' : '解析中...'}
              </>
            ) : parsedData ? (
              '下一步'
            ) : (
              '解析工作流'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowUploader;