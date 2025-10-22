import React, { useState } from 'react';

function App() {
  const [activeView, setActiveView] = useState('test');

  // 测试组件
  const TestComponent = () => (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>测试组件</h1>
      <p>如果能看到这个内容，说明基本渲染没有问题</p>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部导航栏 */}
      <div style={{ padding: '0.75rem', borderBottom: '1px solid #ccc', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>AI Canvas Tool</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveView('test')}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backgroundColor: activeView === 'test' ? '#3b82f6' : 'transparent',
              color: activeView === 'test' ? 'white' : '#4b5563',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            测试
          </button>
        </div>
      </div>

      {/* 主要内容 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TestComponent />
      </div>
    </div>
  );
}

export default App;