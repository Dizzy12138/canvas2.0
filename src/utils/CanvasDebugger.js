// Canvas调试工具
export class CanvasDebugger {
  static debugCanvas(canvas, source = '') {
    console.group(`Canvas Debug - ${source}`);
    
    console.log('Canvas exists:', !!canvas);
    console.log('Canvas type:', typeof canvas);
    
    if (canvas) {
      console.log('Canvas constructor:', canvas.constructor?.name);
      console.log('Has "on" method:', typeof canvas.on === 'function');
      console.log('Has "off" method:', typeof canvas.off === 'function');
      console.log('Has "getActiveObjects" method:', typeof canvas.getActiveObjects === 'function');
      console.log('Has "renderAll" method:', typeof canvas.renderAll === 'function');
      console.log('Has "getObjects" method:', typeof canvas.getObjects === 'function');
      console.log('Canvas width:', canvas.width);
      console.log('Canvas height:', canvas.height);
      
      // 检查是否为Fabric.js canvas - 支持多种构造函数名称
      const validConstructorNames = ['Canvas', 'klass', 'fabric.Canvas'];
      const constructorName = canvas.constructor?.name;
      const isFabricCanvas = validConstructorNames.includes(constructorName) || 
        (canvas.type === 'canvas' && typeof canvas.on === 'function');
      
      console.log('Is Fabric Canvas:', isFabricCanvas);
      console.log('Constructor matches:', validConstructorNames.includes(constructorName));
      
      // 尝试获取一些基本属性
      try {
        console.log('Objects count:', canvas.getObjects?.()?.length || 'N/A');
        console.log('Active objects count:', canvas.getActiveObjects?.()?.length || 'N/A');
      } catch (error) {
        console.error('Error accessing canvas properties:', error);
      }
    }
    
    console.groupEnd();
    
    return {
      exists: !!canvas,
      type: typeof canvas,
      constructorName: canvas?.constructor?.name,
      isValid: !!(canvas && 
        typeof canvas.on === 'function' &&
        typeof canvas.off === 'function' &&
        typeof canvas.getActiveObjects === 'function' &&
        typeof canvas.renderAll === 'function'),
      isFabricCanvas: !!(canvas && (
        ['Canvas', 'klass', 'fabric.Canvas'].includes(canvas.constructor?.name) ||
        (canvas.type === 'canvas' && typeof canvas.on === 'function')
      ))
    };
  }
  
  static waitForCanvas(canvasRef, maxAttempts = 20, interval = 100) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const check = () => {
        attempts++;
        const canvas = canvasRef.current;
        const debug = this.debugCanvas(canvas, `Attempt ${attempts}`);
        
        if (debug.isValid) {
          console.log(`Canvas ready after ${attempts} attempts`);
          resolve(canvas);
        } else if (attempts >= maxAttempts) {
          console.error(`Canvas not ready after ${maxAttempts} attempts`);
          reject(new Error(`Canvas not ready after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      };
      
      check();
    });
  }
}

export default CanvasDebugger;