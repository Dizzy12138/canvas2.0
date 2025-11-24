import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AppBuilder from './components/AppBuilder';
import OuzhiArtPlatform from './components/OuzhiArtPlatform';
import AppRunner from './components/AppRunner'; // 导入 AppRunner
import ServiceManagerStandalone from './components/ServiceManagerStandalone';
import { Layout, Package, Palette, Play, Server } from 'lucide-react'; // 导入图标

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeView, setActiveView] = useState(() => {
    if (location.pathname.startsWith('/app-builder')) return 'appBuilder';
    if (location.pathname.startsWith('/app-run')) return 'appRunner';
    if (location.pathname === '/services') return 'services';
    if (location.pathname === '/ouzhi') return 'ouzhi';
    return 'appBuilder';
  });

  // 欧智艺术平台相关状态
  const [projectName, setProjectName] = useState('未命名项目');
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (location.pathname.startsWith('/app-builder')) {
      setActiveView('appBuilder');
    } else if (location.pathname.startsWith('/app-run')) {
      setActiveView('appRunner');
    } else if (location.pathname === '/services') {
      setActiveView('services');
    } else if (location.pathname === '/ouzhi') {
      setActiveView('ouzhi');
    }
  }, [location.pathname]);

  const handleNavigation = (view) => {
    setActiveView(view);
    switch (view) {
      case 'appBuilder':
        navigate('/app-builder/1'); // 始终导航到应用构建器的第一步
        break;
      case 'appRunner': // 新增导航逻辑
        navigate('/app-run');
        break;
      case 'services':
        navigate('/services');
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
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between min-h-[60px] overflow-x-auto">
        <div className="flex items-center gap-4 flex-shrink min-w-0 overflow-hidden">
          {activeView === 'ouzhi' ? (
            <>
              <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap flex-shrink-0">欧智艺术平台</h1>
              <div className="flex items-center gap-2 flex-shrink min-w-0">
                {isEditingName ? (
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                    className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                    autoFocus
                  />
                ) : (
                  <div
                    className="text-sm font-medium text-gray-900 cursor-text hover:bg-gray-100 px-2 py-1 rounded whitespace-nowrap truncate max-w-[200px]"
                    onDoubleClick={() => setIsEditingName(true)}
                    title={projectName}
                  >
                    {projectName}
                  </div>
                )}
                <button className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap flex-shrink-0">+ 新页面</button>
              </div>
            </>
          ) : (
            <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">AI Canvas Tool</h1>
          )}
        </div>
        
        <div className="flex items-center gap-4 flex-shrink-0">
          {/* 导航按钮 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleNavigation('appBuilder')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeView === 'appBuilder'
                  ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Package size={16} />
              <span>应用构建器</span>
            </button>
            <button
              onClick={() => handleNavigation('appRunner')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeView === 'appRunner'
                  ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Play size={16} />
              <span>运行应用</span>
            </button>
            <button
              onClick={() => handleNavigation('services')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeView === 'services'
                  ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Server size={16} />
              <span>服务管理</span>
            </button>
            <button
              onClick={() => handleNavigation('ouzhi')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                activeView === 'ouzhi'
                  ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Palette size={16} />
              <span>欧智艺术</span>
            </button>
          </div>

        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/app-builder/*" element={<AppBuilder />} />
          <Route path="/app-run/:appId?" element={<AppRunner />} /> {/* AppRunner 路由，可选 appId 参数 */}
          <Route path="/ouzhi" element={<OuzhiArtPlatform />} />
          <Route path="/services" element={<ServiceManagerStandalone />} />
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

