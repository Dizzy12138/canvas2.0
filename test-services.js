const http = require('http');

console.log('=== 测试应用数据修复 ===');

// 测试后端API
const testBackend = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8000/api/apps/6901b137091416feb6768e12', (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('后端API响应状态:', res.statusCode);
          console.log('应用数据:', {
            name: result.data?.name,
            workflowVersion: result.data?.workflowVersion,
            timeout: result.data?.timeout,
            timeoutSec: result.data?.timeoutSec,
            hasComponents: !!result.data?.components,
            componentsLength: result.data?.components?.length || 0,
            hasUiBindings: !!result.data?.uiBindings,
            uiBindingsLength: result.data?.uiBindings?.length || 0
          });
          resolve(result);
        } catch (err) {
          console.log('解析响应失败:', err.message);
          console.log('原始响应:', data.substring(0, 200));
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('后端连接失败:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('后端请求超时');
      reject(new Error('Timeout'));
    });
  });
};

// 测试前端连接
const testFrontend = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3004/', (res) => {
      console.log('前端连接状态:', res.statusCode);
      resolve(res.statusCode);
    });
    
    req.on('error', (err) => {
      console.log('前端连接失败:', err.message);
      reject(err);
    });
    
    req.setTimeout(3000, () => {
      console.log('前端请求超时');
      reject(new Error('Timeout'));
    });
  });
};

// 测试代理连接
const testProxy = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://120.221.130.27:20133/', (res) => {
      console.log('代理连接状态:', res.statusCode);
      resolve(res.statusCode);
    });
    
    req.on('error', (err) => {
      console.log('代理连接失败:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('代理请求超时');
      reject(new Error('Timeout'));
    });
  });
};

// 执行测试
const runTests = async () => {
  console.log('开始测试服务连接...\n');
  
  try {
    await testBackend();
  } catch (err) {
    console.log('后端测试失败:', err.message);
  }
  
  console.log('\n');
  
  try {
    await testFrontend();
  } catch (err) {
    console.log('前端测试失败:', err.message);
  }
  
  console.log('\n');
  
  try {
    await testProxy();
  } catch (err) {
    console.log('代理测试失败:', err.message);
  }
  
  console.log('\n=== 测试完成 ===');
  console.log('如果所有服务都正常，请访问: http://120.221.130.27:20133');
  console.log('然后在页面构建器中添加组件并保存，应该能看到 components 正确保存');
};

runTests();