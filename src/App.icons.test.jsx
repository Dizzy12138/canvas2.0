import React, { useState } from 'react';
import { Layout, Workflow, Package, Palette } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState('test');

  // 测试组件
  const TestComponent = () => (
    <div className="p-4">
      <h1 className="text-xl font-bold">图标测试组件</h1>
      <div className="flex items-center space-x-2 mt-4">
        <Layout size={16} />
        <span>画布图标</span>
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <Workflow size={16} />
        <span>工作流图标</span>
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <Package size={16} />
        <span>应用构建器图标</span>
      </div>
      <div className="flex items-center space-x-2 mt-2">
        <Palette size={16} />
        <span>欧智艺术图标</span>
      </div>
    </div>
  );

  return (
    <div className="App h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">AI Canvas Tool - 图标测试</h1>
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