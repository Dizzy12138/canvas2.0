import React, { useState } from 'react';

function App() {
  const [message, setMessage] = useState('Hello World');

  return (
    <div className="App">
      <header className="p-4 bg-blue-500 text-white">
        <h1 className="text-2xl font-bold">Minimal Test App</h1>
      </header>
      <main className="p-4">
        <p className="text-lg">{message}</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setMessage('Button clicked!')}
        >
          Click me
        </button>
      </main>
    </div>
  );
}

export default App;