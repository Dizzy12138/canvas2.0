import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import WorkflowEditorPage from './components/WorkflowEditorPage';
import AppBuilder from './components/AppBuilder';
import OuzhiArtPlatform from './components/OuzhiArtPlatform';
import AppRunner from './components/AppRunner'; // 导入 AppRunner
import { Layout, Workflow, Package, Palette, Play } from 'lucide-react'; // 导入 Play 图标

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeView, setActiveView] = useState(() => {
    if (location.pathname.startsWith('/app-builder')) return 'appBuilder';
    if (location.pathname.startsWith('/app-run')) return 'appRunner'; // 新增路由判断
    if (location.pathname === '/workflow') return 'workflow';
    if (location.pathname === '/ouzhi') return 'ouzhi';
    return 'appBuilder'; // 默认视图
  });

  useEffect(() => {
    if (location.pathname.startsWith('/app-builder')) {
      setActiveView('appBuilder');
    } else if (location.pathname.startsWith('/app-run')) {
      setActiveView('appRunner');
    } else if (location.pathname === '/workflow') {
      setActiveView('workflow');
    } else if (location.pathname === '/ouzhi') {
      setActiveView('ouzhi');
    }
  }, [location.pathname]);

  const handleNavigation = (view) => {
    setActiveView(view);
    switch (view) {
      case 'workflow':
        navigate('/workflow');
        break;
      case 'appBuilder':
        navigate('/app-builder/1'); // 始终导航到应用构建器的第一步
        break;
      case 'appRunner': // 新增导航逻辑
        navigate('/app-run');
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
          <button
            onClick={() => handleNavigation('workflow')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'workflow'
                ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Workflow size={16} />
            <span>工作流</span>
          </button>
          <button
            onClick={() => handleNavigation('appBuilder')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'appBuilder'
                ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Package size={16} />
            <span>应用构建器</span>
          </button>
          <button
            onClick={() => handleNavigation('appRunner')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'appRunner'
                ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Play size={16} />
            <span>运行应用</span>
          </button>
          <button
            onClick={() => handleNavigation('ouzhi')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === 'ouzhi'
                ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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
          <Route path="/app-run/:appId?" element={<AppRunner />} /> {/* AppRunner 路由，可选 appId 参数 */}
          <Route path="/ouzhi" element={<OuzhiArtPlatform />} />
          <Route path="/" element={<AppBuilder />} /> {/* 默认路由 */} 
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

