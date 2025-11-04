const axios = require('axios');

async function testAppData() {
  try {
    console.log('Testing app data loading...');
    
    // 测试获取应用数据
    const response = await axios.get('http://localhost:8000/api/apps/6901b137091416feb6768e12');
    const appData = response.data.data;
    
    console.log('App Data:', {
      id: appData.id,
      name: appData.name,
      components: appData.components,
      uiBindings: appData.uiBindings,
      paramsSchema: appData.paramsSchema
    });
    
    // 测试保存空数组
    const updateData = {
      components: [],
      uiBindings: [],
      paramsSchema: []
    };
    
    console.log('Testing PATCH with empty arrays...');
    const patchResponse = await axios.patch(`http://localhost:8000/api/apps/${appData.id}`, updateData);
    console.log('PATCH Response:', patchResponse.status);
    
    // 再次获取验证
    const verifyResponse = await axios.get(`http://localhost:8000/api/apps/${appData.id}`);
    const verifyData = verifyResponse.data.data;
    
    console.log('After PATCH:', {
      components: verifyData.components,
      uiBindings: verifyData.uiBindings,
      paramsSchema: verifyData.paramsSchema
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAppData();
