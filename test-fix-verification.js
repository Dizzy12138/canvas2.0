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

// 测试应用数据更新
const testUpdate = () => {
  return new Promise((resolve, reject) => {
    const testData = {
      components: [
        {
          id: 'test-component-1',
          type: 'Image',
          label: '测试图片',
          props: { width: 200, height: 200 }
        }
      ],
      uiBindings: [
        {
          componentId: 'test-component-1',
          bindTo: '632.image_path',
          paramType: 'image'
        }
      ],
      paramsSchema: [
        {
          path: '632.image_path',
          type: 'image',
          label: '图片路径',
          expose: true
        }
      ]
    };
    
    const postData = JSON.stringify(testData);
    
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/apps/6901b137091416feb6768e12',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('更新响应状态:', res.statusCode);
          console.log('更新结果:', {
            success: result.success,
            hasData: !!result.data,
            dataComponentsLength: result.data?.components?.length || 0,
            dataUiBindingsLength: result.data?.uiBindings?.length || 0
          });
          resolve(result);
        } catch (err) {
          console.log('解析更新响应失败:', err.message);
          console.log('原始响应:', data.substring(0, 200));
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log('更新请求失败:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('更新请求超时');
      reject(new Error('Timeout'));
    });
    
    req.write(postData);
    req.end();
  });
};

// 执行测试
const runTests = async () => {
  try {
    console.log('1. 测试后端连接...');
    await testBackend();
    
    console.log('\n2. 测试数据更新...');
    await testUpdate();
    
    console.log('\n3. 验证更新结果...');
    await testBackend();
    
    console.log('\n=== 测试完成 ===');
    console.log('如果 components 长度 > 0，说明修复成功');
    
  } catch (err) {
    console.log('测试失败:', err.message);
  }
};

runTests();
