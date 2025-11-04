const axios = require('axios');

async function testAppSave() {
  try {
    console.log('=== 测试应用保存 ===');
    
    // 1. 获取当前应用数据
    console.log('\n1. 获取当前应用数据...');
    const getResponse = await axios.get('http://localhost:8000/api/apps/6901b137091416feb6768e12');
    console.log('当前应用数据:');
    console.log('- Name:', getResponse.data.data.name);
    console.log('- Components:', JSON.stringify(getResponse.data.data.components, null, 2));
    console.log('- UI Bindings:', JSON.stringify(getResponse.data.data.uiBindings, null, 2));
    console.log('- Params Schema:', JSON.stringify(getResponse.data.data.paramsSchema, null, 2));
    
    // 2. 模拟保存一个组件
    console.log('\n2. 模拟保存组件数据...');
    const testComponents = [
      {
        id: 'comp_test_123',
        type: 'image',
        label: '测试图片组件',
        properties: { placeholder: '请上传图片' },
        order: 0
      }
    ];
    
    const testUiBindings = [
      {
        componentId: 'comp_test_123',
        bindTo: '632.image',
        componentType: 'image'
      }
    ];
    
    const testParamsSchema = [
      {
        path: '632.image',
        type: 'image',
        label: '图片',
        expose: true
      }
    ];
    
    const saveData = {
      components: testComponents,
      uiBindings: testUiBindings,
      paramsSchema: testParamsSchema
    };
    
    console.log('保存数据:', JSON.stringify(saveData, null, 2));
    
    // 3. 保存数据
    console.log('\n3. 保存数据到后端...');
    const saveResponse = await axios.patch('http://localhost:8000/api/apps/6901b137091416feb6768e12', saveData);
    console.log('保存响应:', saveResponse.status);
    
    // 4. 验证保存结果
    console.log('\n4. 验证保存结果...');
    const verifyResponse = await axios.get('http://localhost:8000/api/apps/6901b137091416feb6768e12');
    console.log('保存后的应用数据:');
    console.log('- Components:', JSON.stringify(verifyResponse.data.data.components, null, 2));
    console.log('- UI Bindings:', JSON.stringify(verifyResponse.data.data.uiBindings, null, 2));
    console.log('- Params Schema:', JSON.stringify(verifyResponse.data.data.paramsSchema, null, 2));
    
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
  }
}

testAppSave();
