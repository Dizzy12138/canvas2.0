import React, { useState } from 'react';
import { Layout } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState('test');

  // 简单的测试组件
  const TestComponent = () => (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: 'blue' }}>简化版测试应用</h1>
      <p>如果看到这个页面，说明基本结构没有问题</p>
    </div>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px', borderBottom: '1px solid #ccc', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>AI Canvas Tool</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveView('test')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: activeView === 'test' ? '#3b82f6' : 'transparent',
              color: activeView === 'test' ? 'white' : '#4b5563',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Layout size={16} />
            <span>测试</span>
          </button>
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TestComponent />
      </div>
    </div>
  );
}

export default App;