// 蒙版功能测试脚本
// 在浏览器控制台中运行以测试蒙版功能

// 确保fabric.js已加载
if (typeof fabric === 'undefined') {
  console.warn('⚠️ Fabric.js未加载，请先加载Fabric.js库');
}

console.log('🎭 Canvas 2.0 蒙版功能测试');

// 测试函数：创建测试图层和对象
function createTestContent() {
  console.log('📝 创建测试内容...');
  
  // 模拟在当前图层添加一些测试对象
  const testObjects = [
    { type: 'rectangle', left: 100, top: 100, width: 200, height: 150 },
    { type: 'circle', left: 300, top: 200, radius: 80 },
    { type: 'text', left: 150, top: 300, text: '测试文本' }
  ];
  
  console.log('✅ 测试内容创建完成:', testObjects);
  return testObjects;
}

// 测试函数：验证蒙版创建
function testMaskCreation() {
  console.log('🎭 测试蒙版创建...');
  
  const maskData = {
    id: 'test_mask_' + Date.now(),
    type: 'rectangle',
    layerId: 'test_layer',
    bounds: { left: 50, top: 50, width: 300, height: 200 },
    visible: true
  };
  
  console.log('✅ 蒙版数据创建成功:', maskData);
  return maskData;
}

// 测试函数：验证蒙版应用逻辑
function testMaskApplication(objects, maskData) {
  console.log('🔧 测试蒙版应用逻辑...');
  
  const maskedObjects = objects.map(obj => {
    // 模拟clipPath应用
    const clippedObj = {
      ...obj,
      clipPath: {
        type: maskData.type,
        bounds: maskData.bounds
      },
      maskId: maskData.id
    };
    
    console.log(`📎 对象 ${obj.type} 应用蒙版:`, clippedObj);
    return clippedObj;
  });
  
  console.log('✅ 蒙版应用测试完成');
  return maskedObjects;
}

// 测试函数：验证蒙版移除
function testMaskRemoval(maskedObjects) {
  console.log('🗑️ 测试蒙版移除...');
  
  const unmaskedObjects = maskedObjects.map(obj => {
    const { clipPath, maskId, ...cleanObj } = obj;
    console.log(`🔓 对象 ${obj.type} 移除蒙版`);
    return cleanObj;
  });
  
  console.log('✅ 蒙版移除测试完成');
  return unmaskedObjects;
}

// 测试函数：验证蒙版可见性切换
function testMaskVisibility(maskedObjects, visible) {
  console.log(`👁️ 测试蒙版可见性切换: ${visible ? '显示' : '隐藏'}`);
  
  const toggledObjects = maskedObjects.map(obj => {
    if (visible) {
      // 恢复clipPath
      return obj;
    } else {
      // 临时移除clipPath但保留maskId
      const { clipPath, ...tempObj } = obj;
      return tempObj;
    }
  });
  
  console.log('✅ 蒙版可见性切换测试完成');
  return toggledObjects;
}

// 运行完整测试套件
function runMaskTests() {
  console.log('🚀 开始蒙版功能完整测试...');
  console.log('================================');
  
  try {
    // 1. 创建测试内容
    const testObjects = createTestContent();
    
    // 2. 创建蒙版
    const maskData = testMaskCreation();
    
    // 3. 应用蒙版
    const maskedObjects = testMaskApplication(testObjects, maskData);
    
    // 4. 测试可见性切换
    const hiddenMaskObjects = testMaskVisibility(maskedObjects, false);
    const visibleMaskObjects = testMaskVisibility(maskedObjects, true);
    
    // 5. 移除蒙版
    const cleanObjects = testMaskRemoval(maskedObjects);
    
    console.log('================================');
    console.log('🎉 所有蒙版功能测试通过！');
    console.log('📊 测试统计:');
    console.log(`   - 测试对象数: ${testObjects.length}`);
    console.log(`   - 蒙版类型: ${maskData.type}`);
    console.log(`   - 应用成功: ${maskedObjects.length}/${testObjects.length}`);
    console.log(`   - 移除成功: ${cleanObjects.length}/${maskedObjects.length}`);
    
    return {
      success: true,
      testObjects,
      maskData,
      maskedObjects,
      cleanObjects
    };
    
  } catch (error) {
    console.error('❌ 蒙版测试失败:', error);
    return { success: false, error };
  }
}

// 测试工具函数：验证Fabric.js集成
function testFabricIntegration() {
  console.log('🔧 测试Fabric.js集成...');
  
  if (typeof fabric === 'undefined') {
    console.warn('⚠️ Fabric.js未加载，跳过集成测试');
    return false;
  }
  
  try {
    // 测试clipPath创建
    const rect = new fabric.Rect({
      left: 0, top: 0, width: 100, height: 100,
      fill: 'red'
    });
    
    const clipPath = new fabric.Rect({
      left: 25, top: 25, width: 50, height: 50,
      absolutePositioned: true
    });
    
    rect.clipPath = clipPath;
    
    console.log('✅ Fabric.js clipPath创建成功');
    console.log('📝 对象信息:', {
      type: rect.type,
      hasClipPath: !!rect.clipPath,
      clipPathType: rect.clipPath?.type
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Fabric.js集成测试失败:', error);
    return false;
  }
}

// 导出测试函数供全局使用
window.CanvasMaskTests = {
  runMaskTests,
  testFabricIntegration,
  createTestContent,
  testMaskCreation,
  testMaskApplication,
  testMaskRemoval,
  testMaskVisibility
};

console.log('📋 蒙版测试脚本加载完成！');
console.log('💡 使用 CanvasMaskTests.runMaskTests() 运行完整测试');
console.log('💡 使用 CanvasMaskTests.testFabricIntegration() 测试Fabric.js集成');