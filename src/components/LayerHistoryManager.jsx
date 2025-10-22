import React, { useState, useMemo } from 'react';
import { 
  History, 
  RotateCcw, 
  RotateCw, 
  Clock,
  Calendar,
  Diff
} from 'lucide-react';
import clsx from 'clsx';

const LayerHistoryManager = ({ 
  history = [],
  currentIndex = -1,
  onHistoryGoTo,
  onHistoryUndo,
  onHistoryRedo,
  onHistoryCompare,
  className 
}) => {
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  // 格式化时间戳
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 格式化日期
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取历史记录列表
  const historyList = useMemo(() => {
    return history.map((snapshot, index) => ({
      index,
      timestamp: snapshot.timestamp,
      formattedTime: formatTimestamp(snapshot.timestamp),
      formattedDate: formatDate(snapshot.timestamp),
      isActive: index === currentIndex,
      isCurrent: index === currentIndex,
      isPast: index < currentIndex,
      isFuture: index > currentIndex
    }));
  }, [history, currentIndex]);

  // 跳转到指定历史记录
  const goToHistory = (index) => {
    onHistoryGoTo?.(index);
  };

  // 比较历史记录
  const compareHistory = (index) => {
    if (currentIndex !== -1 && index !== currentIndex) {
      onHistoryCompare?.(currentIndex, index);
    }
  };

  // 渲染历史记录项
  const renderHistoryItem = (item) => {
    return (
      <div
        key={item.index}
        className={clsx(
          'flex items-center p-3 rounded-lg border cursor-pointer transition-colors group',
          item.isCurrent 
            ? 'bg-blue-50 border-blue-200' 
            : item.isPast
            ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            : 'bg-gray-100 border-gray-200 opacity-60'
        )}
        onClick={() => goToHistory(item.index)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
          <Clock className="w-4 h-4 text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {item.formattedTime}
              </span>
              {item.isCurrent && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                  当前
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500">
              {item.formattedDate}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <LayersIcon count={history[item.index]?.layers?.length || 0} />
              <span className="text-xs text-gray-500">
                {history[item.index]?.layers?.length || 0} 图层
              </span>
            </div>
            <div className="flex items-center gap-1">
              <MasksIcon count={history[item.index]?.masks?.length || 0} />
              <span className="text-xs text-gray-500">
                {history[item.index]?.masks?.length || 0} 蒙版
              </span>
            </div>
          </div>
        </div>
        
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-2 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              compareHistory(item.index);
            }}
            className="p-1 rounded text-gray-400 hover:text-gray-600"
            title="比较差异"
          >
            <Diff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // 图层图标组件
  const LayersIcon = ({ count }) => (
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  );

  // 蒙版图标组件
  const MasksIcon = ({ count }) => (
    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className={clsx('panel p-4', className)}>
      <div className="space-y-4">
        {/* 标题 */}
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">历史记录</h3>
        </div>

        {/* 导航按钮 */}
        <div className="flex gap-2">
          <button
            onClick={onHistoryUndo}
            disabled={currentIndex <= 0}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-colors',
              currentIndex > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            <span>撤销</span>
          </button>
          
          <button
            onClick={onHistoryRedo}
            disabled={currentIndex >= history.length - 1}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-colors',
              currentIndex < history.length - 1
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            )}
          >
            <RotateCw className="w-4 h-4" />
            <span>重做</span>
          </button>
        </div>

        {/* 历史记录列表 */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {historyList.length > 0 ? (
            historyList.map(item => renderHistoryItem(item))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm">暂无历史记录</p>
            </div>
          )}
        </div>

        {/* 历史统计 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {historyList.filter(item => item.isPast).length}
              </div>
              <div className="text-xs text-gray-600">可撤销</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {historyList.filter(item => item.isCurrent).length}
              </div>
              <div className="text-xs text-gray-600">当前</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {historyList.filter(item => item.isFuture).length}
              </div>
              <div className="text-xs text-gray-600">可重做</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayerHistoryManager;