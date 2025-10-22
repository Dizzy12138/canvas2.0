import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom'; // 添加路由相关导入
// import TldrawCanvas from './components/TldrawCanvas'; // 暂时注释掉原来的画布导入
import WorkflowEditorPage from './components/WorkflowEditorPage';
import AppBuilder from '@frontend/components/AppBuilder';
import OuzhiArtPlatform from './components/OuzhiArtPlatform';
import { Layout, Workflow, Package, Palette } from 'lucide-react';

// 创建一个带路由的App组件
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 根据当前路径确定活动视图
  const getCurrentView = () => {
    if (location.pathname.startsWith('/app-builder')) return 'appBuilder';
    if (location.pathname === '/workflow') return 'workflow';
    if (location.pathname === '/ouzhi') return 'ouzhi';
    return 'appBuilder'; // 默认视图
  };

  const [activeView, setActiveView] = useState(getCurrentView());

  // 处理导航
  const handleNavigation = (view) => {
    setActiveView(view);
    switch (view) {
      case 'workflow':
        navigate('/workflow');
        break;
      case 'appBuilder':
        // 如果是从服务管理页面点击上传工作流按钮过来的，保持当前路径
        // 否则导航到应用构建器的第一步
        if (!location.pathname.startsWith('/app-builder')) {
          navigate('/app-builder/1');
        }
        break;
      case 'ouzhi':
        navigate('/ouzhi');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="App h-screen flex flex-col">
      {/* 顶部导航栏 */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">AI Canvas Tool</h1>
        <div className="flex items-center space-x-2">
          {/* <button
            onClick={() => handleNavigation('canvas')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'canvas'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Layout size={16} />
            <span>画布</span>
          </button> */}
          <button
            onClick={() => handleNavigation('workflow')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'workflow'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Workflow size={16} />
            <span>工作流</span>
          </button>
          <button
            onClick={() => handleNavigation('appBuilder')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'appBuilder'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package size={16} />
            <span>应用构建器</span>
          </button>
          <button
            onClick={() => handleNavigation('ouzhi')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'ouzhi'
                ? 'bg-primary-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Palette size={16} />
            <span>欧智艺术</span>
          </button>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/workflow" element={<WorkflowEditorPage />} />
          <Route path="/app-builder/*" element={<AppBuilder />} />
          <Route path="/ouzhi" element={<OuzhiArtPlatform />} />
          <Route path="/" element={<AppBuilder />} />
        </Routes>
      </div>
    </div>
  );
}

// 主App组件包含Router
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;