import { fabric } from 'fabric';

class SmartSnapSystem {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      snapToGrid: false,
      snapToObjects: false,
      snapToGuidelines: false,
      gridSize: 20,
      snapTolerance: 10,
      showSnapLines: true,
      ...options
    };
    
    this.snapLines = [];
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.on('object:moving', this.handleObjectMoving.bind(this));
    this.canvas.on('object:scaling', this.handleObjectScaling.bind(this));
    this.canvas.on('object:rotating', this.handleObjectRotating.bind(this));
    this.canvas.on('mouse:up', this.clearSnapLines.bind(this));
  }

  handleObjectMoving(e) {
    const obj = e.target;
    if (!obj || obj.isSnapTarget) return;

    this.clearSnapLines();
    
    let snapResult = {
      left: obj.left,
      top: obj.top,
      snappedX: false,
      snappedY: false
    };

    // 网格吸附
    if (this.options.snapToGrid) {
      snapResult = this.snapToGrid(obj, snapResult);
    }

    // 对象吸附
    if (this.options.snapToObjects) {
      snapResult = this.snapToObjects(obj, snapResult);
    }

    // 辅助线吸附
    if (this.options.snapToGuidelines && this.guidelines) {
      snapResult = this.snapToGuidelines(obj, snapResult);
    }

    // 应用吸附结果
    obj.set({
      left: snapResult.left,
      top: snapResult.top
    });

    // 显示吸附线
    if (this.options.showSnapLines) {
      this.renderSnapLines();
    }
  }

  handleObjectScaling(e) {
    const obj = e.target;
    if (!obj) return;

    // 等比例缩放时的吸附
    if (this.options.snapToGrid && e.e.shiftKey) {
      const gridSize = this.options.gridSize;
      const scaledWidth = obj.width * obj.scaleX;
      const scaledHeight = obj.height * obj.scaleY;
      
      const snappedWidth = Math.round(scaledWidth / gridSize) * gridSize;
      const snappedHeight = Math.round(scaledHeight / gridSize) * gridSize;
      
      obj.set({
        scaleX: snappedWidth / obj.width,
        scaleY: snappedHeight / obj.height
      });
    }
  }

  handleObjectRotating(e) {
    const obj = e.target;
    if (!obj) return;

    // 角度吸附（15度增量）
    const snapAngle = 15;
    const currentAngle = obj.angle;
    const snappedAngle = Math.round(currentAngle / snapAngle) * snapAngle;
    
    if (Math.abs(currentAngle - snappedAngle) < 5) {
      obj.set({ angle: snappedAngle });
    }
  }

  snapToGrid(obj, snapResult) {
    const gridSize = this.options.gridSize;
    const tolerance = this.options.snapTolerance;

    // 计算对象边界
    const objBounds = this.getObjectBounds(obj);
    
    // X轴吸附
    const leftSnap = Math.round(objBounds.left / gridSize) * gridSize;
    const rightSnap = Math.round(objBounds.right / gridSize) * gridSize;
    const centerXSnap = Math.round(objBounds.centerX / gridSize) * gridSize;
    
    const leftDist = Math.abs(objBounds.left - leftSnap);
    const rightDist = Math.abs(objBounds.right - rightSnap);
    const centerXDist = Math.abs(objBounds.centerX - centerXSnap);
    
    if (leftDist < tolerance && leftDist <= rightDist && leftDist <= centerXDist) {
      snapResult.left = leftSnap;
      snapResult.snappedX = true;
      this.addSnapLine('vertical', leftSnap);
    } else if (rightDist < tolerance && rightDist <= centerXDist) {
      snapResult.left = rightSnap - objBounds.width;
      snapResult.snappedX = true;
      this.addSnapLine('vertical', rightSnap);
    } else if (centerXDist < tolerance) {
      snapResult.left = centerXSnap - objBounds.width / 2;
      snapResult.snappedX = true;
      this.addSnapLine('vertical', centerXSnap);
    }

    // Y轴吸附
    const topSnap = Math.round(objBounds.top / gridSize) * gridSize;
    const bottomSnap = Math.round(objBounds.bottom / gridSize) * gridSize;
    const centerYSnap = Math.round(objBounds.centerY / gridSize) * gridSize;
    
    const topDist = Math.abs(objBounds.top - topSnap);
    const bottomDist = Math.abs(objBounds.bottom - bottomSnap);
    const centerYDist = Math.abs(objBounds.centerY - centerYSnap);
    
    if (topDist < tolerance && topDist <= bottomDist && topDist <= centerYDist) {
      snapResult.top = topSnap;
      snapResult.snappedY = true;
      this.addSnapLine('horizontal', topSnap);
    } else if (bottomDist < tolerance && bottomDist <= centerYDist) {
      snapResult.top = bottomSnap - objBounds.height;
      snapResult.snappedY = true;
      this.addSnapLine('horizontal', bottomSnap);
    } else if (centerYDist < tolerance) {
      snapResult.top = centerYSnap - objBounds.height / 2;
      snapResult.snappedY = true;
      this.addSnapLine('horizontal', centerYSnap);
    }

    return snapResult;
  }

  snapToObjects(obj, snapResult) {
    const tolerance = this.options.snapTolerance;
    const objBounds = this.getObjectBounds(obj);
    const otherObjects = this.canvas.getObjects().filter(o => o !== obj && o.visible && !o.isSnapTarget);

    let minDistanceX = tolerance;
    let minDistanceY = tolerance;
    let snapX = null;
    let snapY = null;

    otherObjects.forEach(other => {
      const otherBounds = this.getObjectBounds(other);
      
      // X轴吸附检测
      const xAlignments = [
        { pos: otherBounds.left, type: 'left-left' },
        { pos: otherBounds.right, type: 'left-right' },
        { pos: otherBounds.centerX, type: 'center-center' },
        { pos: otherBounds.left - objBounds.width, type: 'right-left' },
        { pos: otherBounds.right - objBounds.width, type: 'right-right' },
        { pos: otherBounds.centerX - objBounds.width / 2, type: 'center-center' }
      ];

      xAlignments.forEach(align => {
        const distance = Math.abs(objBounds.left - align.pos);
        if (distance < minDistanceX) {
          minDistanceX = distance;
          snapX = align;
        }
      });

      // Y轴吸附检测
      const yAlignments = [
        { pos: otherBounds.top, type: 'top-top' },
        { pos: otherBounds.bottom, type: 'top-bottom' },
        { pos: otherBounds.centerY, type: 'center-center' },
        { pos: otherBounds.top - objBounds.height, type: 'bottom-top' },
        { pos: otherBounds.bottom - objBounds.height, type: 'bottom-bottom' },
        { pos: otherBounds.centerY - objBounds.height / 2, type: 'center-center' }
      ];

      yAlignments.forEach(align => {
        const distance = Math.abs(objBounds.top - align.pos);
        if (distance < minDistanceY) {
          minDistanceY = distance;
          snapY = align;
        }
      });
    });

    // 应用吸附
    if (snapX && minDistanceX < tolerance) {
      snapResult.left = snapX.pos;
      snapResult.snappedX = true;
      
      // 添加吸附线
      if (snapX.type.includes('left')) {
        this.addSnapLine('vertical', snapX.pos);
      } else if (snapX.type.includes('right')) {
        this.addSnapLine('vertical', snapX.pos + objBounds.width);
      } else if (snapX.type.includes('center')) {
        this.addSnapLine('vertical', snapX.pos + objBounds.width / 2);
      }
    }

    if (snapY && minDistanceY < tolerance) {
      snapResult.top = snapY.pos;
      snapResult.snappedY = true;
      
      // 添加吸附线
      if (snapY.type.includes('top')) {
        this.addSnapLine('horizontal', snapY.pos);
      } else if (snapY.type.includes('bottom')) {
        this.addSnapLine('horizontal', snapY.pos + objBounds.height);
      } else if (snapY.type.includes('center')) {
        this.addSnapLine('horizontal', snapY.pos + objBounds.height / 2);
      }
    }

    return snapResult;
  }

  snapToGuidelines(obj, snapResult) {
    if (!this.guidelines || this.guidelines.length === 0) return snapResult;

    const tolerance = this.options.snapTolerance;
    const objBounds = this.getObjectBounds(obj);

    this.guidelines.forEach(guideline => {
      if (!guideline.visible) return;

      if (guideline.type === 'vertical') {
        const distances = [
          { pos: guideline.position, dist: Math.abs(objBounds.left - guideline.position), type: 'left' },
          { pos: guideline.position - objBounds.width, dist: Math.abs(objBounds.right - guideline.position), type: 'right' },
          { pos: guideline.position - objBounds.width / 2, dist: Math.abs(objBounds.centerX - guideline.position), type: 'center' }
        ];

        const closest = distances.reduce((min, curr) => curr.dist < min.dist ? curr : min);
        if (closest.dist < tolerance) {
          snapResult.left = closest.pos;
          snapResult.snappedX = true;
          this.addSnapLine('vertical', guideline.position);
        }
      } else if (guideline.type === 'horizontal') {
        const distances = [
          { pos: guideline.position, dist: Math.abs(objBounds.top - guideline.position), type: 'top' },
          { pos: guideline.position - objBounds.height, dist: Math.abs(objBounds.bottom - guideline.position), type: 'bottom' },
          { pos: guideline.position - objBounds.height / 2, dist: Math.abs(objBounds.centerY - guideline.position), type: 'center' }
        ];

        const closest = distances.reduce((min, curr) => curr.dist < min.dist ? curr : min);
        if (closest.dist < tolerance) {
          snapResult.top = closest.pos;
          snapResult.snappedY = true;
          this.addSnapLine('horizontal', guideline.position);
        }
      }
    });

    return snapResult;
  }

  getObjectBounds(obj) {
    return {
      left: obj.left,
      top: obj.top,
      width: obj.width * obj.scaleX,
      height: obj.height * obj.scaleY,
      right: obj.left + obj.width * obj.scaleX,
      bottom: obj.top + obj.height * obj.scaleY,
      centerX: obj.left + (obj.width * obj.scaleX) / 2,
      centerY: obj.top + (obj.height * obj.scaleY) / 2
    };
  }

  addSnapLine(type, position) {
    this.snapLines.push({
      type,
      position,
      id: `snap_${Date.now()}_${Math.random()}`
    });
  }

  renderSnapLines() {
    this.clearSnapLines();
    
    this.snapLines.forEach(line => {
      const snapLine = new fabric.Line(
        line.type === 'vertical' 
          ? [line.position, 0, line.position, this.canvas.height]
          : [0, line.position, this.canvas.width, line.position],
        {
          stroke: '#ff4757',
          strokeWidth: 1,
          strokeDashArray: [5, 5],
          selectable: false,
          evented: false,
          isSnapTarget: true,
          excludeFromExport: true
        }
      );
      
      this.canvas.add(snapLine);
      this.canvas.bringToFront(snapLine);
    });
    
    this.canvas.renderAll();
  }

  clearSnapLines() {
    const snapObjects = this.canvas.getObjects().filter(obj => obj.isSnapTarget);
    snapObjects.forEach(obj => this.canvas.remove(obj));
    this.snapLines = [];
  }

  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  setGuidelines(guidelines) {
    this.guidelines = guidelines;
  }

  destroy() {
    this.canvas.off('object:moving');
    this.canvas.off('object:scaling');
    this.canvas.off('object:rotating');
    this.canvas.off('mouse:up');
    this.clearSnapLines();
  }
}

export default SmartSnapSystem;