import React, { useState } from 'react';

function App() {
  const [activeView, setActiveView] = useState('test');

  // 测试组件
  const TestComponent = () => (
    <div className="p-4">
      <h1 className="text-xl font-bold">测试组件</h1>
      <p>如果能看到这个内容，说明基本渲染没有问题</p>
    </div>
  );

  return (
    <div className="App h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">AI Canvas Tool - 修复版</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveView('test')}
            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'test'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            测试
          </button>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <TestComponent />
      </div>
    </div>
  );
}

export default App;