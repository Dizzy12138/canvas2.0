const axios = require('axios');

async function debugAppData() {
  try {
    console.log('=== 调试应用数据 ===');
    
    // 1. 获取应用数据
    const response = await axios.get('http://localhost:8000/api/apps/6901b137091416feb6768e12');
    const appData = response.data.data;
    
    console.log('1. 应用基本信息:');
    console.log('  - ID:', appData.id);
    console.log('  - Name:', appData.name);
    console.log('  - Components:', appData.components);
    console.log('  - UI Bindings:', appData.uiBindings);
    console.log('  - Params Schema:', appData.paramsSchema);
    
    // 2. 测试保存一些测试数据
    const testData = {
      components: [
        {
          id: 'test_comp_1',
          type: 'text',
          label: '测试文本输入',
          order: 0
        }
      ],
      uiBindings: [
        {
          componentId: 'test_comp_1',
          bindTo: '632.image_path'
        }
      ],
      paramsSchema: []
    };
    
    console.log('\n2. 保存测试数据...');
    const saveResponse = await axios.patch(`http://localhost:8000/api/apps/${appData.id}`, testData);
    console.log('保存结果:', saveResponse.status);
    
    // 3. 再次获取验证
    const verifyResponse = await axios.get(`http://localhost:8000/api/apps/${appData.id}`);
    const verifyData = verifyResponse.data.data;
    
    console.log('\n3. 验证保存结果:');
    console.log('  - Components:', verifyData.components);
    console.log('  - UI Bindings:', verifyData.uiBindings);
    
  } catch (error) {
    console.error('错误:', error.response?.data || error.message);
  }
}

debugAppData();
