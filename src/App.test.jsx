import React from 'react';

function App() {
  return (
    <div className="App" style={{ padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: 'blue' }}>测试应用</h1>
      <p>如果看到这个页面，说明基本结构没有问题</p>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: 'lightgreen' }}>
        <p>当前时间: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default App;