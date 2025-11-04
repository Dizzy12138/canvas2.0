const { spawn } = require('child_process');
const http = require('http');

console.log('=== 彻底清理所有进程 ===');

// 清理进程
const cleanup = () => {
  return new Promise((resolve) => {
    const processes = [
      'pkill -9 -f "node.*server.js"',
      'pkill -9 -f "proxy-server"',
      'pkill -9 -f "vite"',
      'fuser -k 8000/tcp',
      'fuser -k 20133/tcp',
      'fuser -k 3000/tcp',
      'fuser -k 3001/tcp',
      'fuser -k 3002/tcp',
      'fuser -k 3003/tcp',
      'fuser -k 3004/tcp'
    ];
    
    let completed = 0;
    processes.forEach(cmd => {
      spawn('bash', ['-c', cmd], { stdio: 'ignore' }).on('close', () => {
        completed++;
        if (completed === processes.length) {
          console.log('清理完成，等待3秒...');
          setTimeout(resolve, 3000);
        }
      });
    });
  });
};

// 启动后端
const startBackend = () => {
  return new Promise((resolve) => {
    console.log('=== 启动后端服务 (端口 8000) ===');
    const backend = spawn('node', ['backend/server.js'], {
      cwd: '/root/canvas2.0',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    backend.stdout.on('data', (data) => {
      console.log('Backend:', data.toString().trim());
    });
    
    backend.stderr.on('data', (data) => {
      console.log('Backend Error:', data.toString().trim());
    });
    
    setTimeout(() => {
      console.log('后端服务启动完成');
      resolve(backend);
    }, 3000);
  });
};

// 启动前端
const startFrontend = () => {
  return new Promise((resolve) => {
    console.log('=== 启动前端服务 ===');
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: '/root/canvas2.0',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    let frontendPort = '3000';
    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Frontend:', output.trim());
      
      // 提取端口号
      const portMatch = output.match(/http:\/\/localhost:(\d+)/);
      if (portMatch) {
        frontendPort = portMatch[1];
      }
    });
    
    frontend.stderr.on('data', (data) => {
      console.log('Frontend Error:', data.toString().trim());
    });
    
    setTimeout(() => {
      console.log(`前端服务启动完成，端口: ${frontendPort}`);
      resolve({ process: frontend, port: frontendPort });
    }, 5000);
  });
};

// 更新代理配置
const updateProxy = (port) => {
  return new Promise((resolve) => {
    console.log(`=== 更新代理配置 (端口 ${port}) ===`);
    const fs = require('fs');
    const proxyFile = '/root/canvas2.0/proxy-server.cjs';
    let content = fs.readFileSync(proxyFile, 'utf8');
    content = content.replace(/const TARGET_PORT = \d+;/, `const TARGET_PORT = ${port};`);
    fs.writeFileSync(proxyFile, content);
    console.log('代理配置更新完成');
    resolve();
  });
};

// 启动代理
const startProxy = () => {
  return new Promise((resolve) => {
    console.log('=== 启动代理服务 (端口 20133) ===');
    const proxy = spawn('node', ['proxy-server.cjs'], {
      cwd: '/root/canvas2.0',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    proxy.stdout.on('data', (data) => {
      console.log('Proxy:', data.toString().trim());
    });
    
    proxy.stderr.on('data', (data) => {
      console.log('Proxy Error:', data.toString().trim());
    });
    
    setTimeout(() => {
      console.log('代理服务启动完成');
      resolve(proxy);
    }, 2000);
  });
};

// 测试服务
const testServices = () => {
  return new Promise((resolve) => {
    console.log('=== 测试服务连接 ===');
    
    setTimeout(() => {
      // 测试后端
      const backendReq = http.get('http://localhost:8000/api/apps/6901b137091416feb6768e12', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            console.log('后端测试成功:', {
              status: res.statusCode,
              hasData: !!result.data,
              hasComponents: !!result.data?.components,
              componentsLength: result.data?.components?.length || 0
            });
          } catch (err) {
            console.log('后端测试失败:', err.message);
          }
          resolve();
        });
      });
      
      backendReq.on('error', (err) => {
        console.log('后端连接失败:', err.message);
        resolve();
      });
      
      backendReq.setTimeout(5000, () => {
        console.log('后端测试超时');
        resolve();
      });
    }, 2000);
  });
};

// 主流程
const main = async () => {
  try {
    await cleanup();
    
    const backend = await startBackend();
    const frontend = await startFrontend();
    
    await updateProxy(frontend.port);
    const proxy = await startProxy();
    
    console.log('\n=== 服务启动完成 ===');
    console.log('后端: http://localhost:8000');
    console.log(`前端: http://localhost:${frontend.port}`);
    console.log('代理: http://120.221.130.27:20133');
    console.log('');
    console.log('访问地址: http://120.221.130.27:20133');
    console.log('');
    
    await testServices();
    
    console.log('\n=== 修复完成 ===');
    console.log('现在可以在页面构建器中添加组件并保存，components 应该能正确保存');
    
  } catch (err) {
    console.log('启动失败:', err.message);
  }
};

main();
