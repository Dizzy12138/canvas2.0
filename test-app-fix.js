const http = require('http');

// 测试应用数据保存和获取
const testAppData = async () => {
  const appId = '6901b137091416feb6768e12';
  
  console.log('=== 测试应用数据修复 ===');
  
  // 1. 先获取当前应用数据
  console.log('1. 获取当前应用数据...');
  const getCurrentApp = () => {
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:8000/api/apps/${appId}`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
    });
  };
  
  // 2. 更新应用数据（模拟前端保存）
  const updateApp = (components, uiBindings, paramsSchema) => {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        components: components,
        uiBindings: uiBindings,
        paramsSchema: paramsSchema
      });
      
      const options = {
        hostname: 'localhost',
        port: 8000,
        path: `/api/apps/${appId}`,
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
            resolve(result);
          } catch (err) {
            reject(err);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Timeout')));
      req.write(postData);
      req.end();
    });
  };
  
  try {
    // 获取当前数据
    const currentApp = await getCurrentApp();
    console.log('当前应用数据:', {
      name: currentApp.data?.name,
      workflowVersion: currentApp.data?.workflowVersion,
      hasComponents: !!currentApp.data?.components,
      componentsLength: currentApp.data?.components?.length || 0,
      hasUiBindings: !!currentApp.data?.uiBindings,
      uiBindingsLength: currentApp.data?.uiBindings?.length || 0
    });
    
    // 模拟前端保存的数据
    const testComponents = [
      {
        id: 'test-component-1',
        type: 'Image',
        label: '测试图片',
        props: { width: 200, height: 200 }
      }
    ];
    
    const testUiBindings = [
      {
        componentId: 'test-component-1',
        bindTo: '632.image_path',
        paramType: 'image'
      }
    ];
    
    const testParamsSchema = [
      {
        path: '632.image_path',
        type: 'image',
        label: '图片路径',
        expose: true
      }
    ];
    
    console.log('\n2. 保存测试数据...');
    console.log('保存的 components:', testComponents.length);
    console.log('保存的 uiBindings:', testUiBindings.length);
    console.log('保存的 paramsSchema:', testParamsSchema.length);
    
    // 保存数据
    const saveResult = await updateApp(testComponents, testUiBindings, testParamsSchema);
    console.log('保存结果:', {
      success: saveResult.success,
      hasData: !!saveResult.data,
      dataComponentsLength: saveResult.data?.components?.length || 0,
      dataUiBindingsLength: saveResult.data?.uiBindings?.length || 0
    });
    
    // 再次获取验证
    console.log('\n3. 验证保存结果...');
    const verifyApp = await getCurrentApp();
    console.log('验证结果:', {
      name: verifyApp.data?.name,
      workflowVersion: verifyApp.data?.workflowVersion,
      hasComponents: !!verifyApp.data?.components,
      componentsLength: verifyApp.data?.components?.length || 0,
      hasUiBindings: !!verifyApp.data?.uiBindings,
      uiBindingsLength: verifyApp.data?.uiBindings?.length || 0,
      componentsData: verifyApp.data?.components
    });
    
    if (verifyApp.data?.components?.length > 0) {
      console.log('\n✅ 修复成功！components 数据已正确保存');
    } else {
      console.log('\n❌ 修复失败！components 数据仍未保存');
    }
    
  } catch (err) {
    console.log('测试失败:', err.message);
  }
};

// 检查服务是否运行
const checkServices = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8000/api/apps', (res) => {
      console.log('后端服务状态:', res.statusCode);
      resolve(res.statusCode === 200);
    });
    
    req.on('error', (err) => {
      console.log('后端服务未运行:', err.message);
      resolve(false);
    });
    
    req.setTimeout(3000, () => {
      console.log('后端服务连接超时');
      resolve(false);
    });
  });
};

// 执行测试
const runTest = async () => {
  console.log('检查服务状态...');
  const isBackendRunning = await checkServices();
  
  if (!isBackendRunning) {
    console.log('❌ 后端服务未运行，请先启动服务');
    return;
  }
  
  console.log('✅ 后端服务运行正常，开始测试...\n');
  await testAppData();
};

runTest();
