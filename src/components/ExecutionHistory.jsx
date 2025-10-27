import React, { useState, useEffect } from 'react';
import api from '@/api/index.js';

const ExecutionHistory = ({ appId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    if (appId) {
      loadHistory();
    }
  }, [appId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/apps/${appId}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error('加载执行历史失败', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedItem(expandedItem === id ? null : id);
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="text-md font-medium text-gray-900 mb-4">执行历史</h3>
      
      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          暂无执行历史记录
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-md">
              <div 
                className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    item.status === 'success' ? 'bg-green-500' : 
                    item.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(item.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      耗时: {formatDuration(item.durationMs)}
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {item.status === 'success' ? '成功' : 
                   item.status === 'failed' ? '失败' : '处理中'}
                </div>
              </div>
              
              {expandedItem === item.id && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                  <div className="text-sm mb-2">
                    <span className="font-medium">请求ID:</span> {item.requestId}
                  </div>
                  {item.inputs && (
                    <div className="mb-2">
                      <div className="font-medium text-sm mb-1">输入参数:</div>
                      <div className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                        <pre>{JSON.stringify(item.inputs, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  {item.outputs && (
                    <div>
                      <div className="font-medium text-sm mb-1">输出结果:</div>
                      <div className="text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                        <pre>{JSON.stringify(item.outputs, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                  {item.error && (
                    <div className="mt-2">
                      <div className="font-medium text-sm mb-1 text-red-600">错误信息:</div>
                      <div className="text-xs bg-red-50 p-2 rounded border text-red-600">
                        {item.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExecutionHistory;
