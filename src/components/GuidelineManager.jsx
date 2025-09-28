import React, { useState, useEffect, useRef, useCallback } from 'react';

const GuidelineManager = ({ 
  canvas,
  width,
  height,
  showGuidelines = true,
  onGuidelinesChange,
  className 
}) => {
  const overlayRef = useRef(null);
  const [guidelines, setGuidelines] = useState([]);
  const [dragging, setDragging] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // 添加辅助线
  const addGuideline = useCallback((type, position) => {
    const id = `guideline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newGuideline = {
      id,
      type, // 'horizontal' | 'vertical'
      position,
      color: '#ff6b6b',
      locked: false,
      visible: true
    };
    
    setGuidelines(prev => {
      const updated = [...prev, newGuideline];
      onGuidelinesChange?.(updated);
      return updated;
    });
    
    return newGuideline;
  }, [onGuidelinesChange]);

  // 移除辅助线
  const removeGuideline = useCallback((id) => {
    setGuidelines(prev => {
      const updated = prev.filter(g => g.id !== id);
      onGuidelinesChange?.(updated);
      return updated;
    });
  }, [onGuidelinesChange]);

  // 更新辅助线位置
  const updateGuidelinePosition = useCallback((id, position) => {
    setGuidelines(prev => {
      const updated = prev.map(g => 
        g.id === id ? { ...g, position } : g
      );
      onGuidelinesChange?.(updated);
      return updated;
    });
  }, [onGuidelinesChange]);

  // 鼠标事件处理
  const handleMouseDown = useCallback((e) => {
    if (!showGuidelines) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查是否点击了现有辅助线
    const hitGuideline = guidelines.find(g => {
      if (g.locked) return false;
      
      if (g.type === 'horizontal') {
        return Math.abs(y - g.position) < 5;
      } else {
        return Math.abs(x - g.position) < 5;
      }
    });

    if (hitGuideline) {
      setDragging({
        guideline: hitGuideline,
        offset: hitGuideline.type === 'horizontal' ? y - hitGuideline.position : x - hitGuideline.position
      });
    } else if (x < 20 && y > 20) {
      // 从垂直标尺拖出
      setIsCreating({ type: 'vertical', startX: x });
    } else if (y < 20 && x > 20) {
      // 从水平标尺拖出
      setIsCreating({ type: 'horizontal', startY: y });
    }
  }, [guidelines, showGuidelines]);

  const handleMouseMove = useCallback((e) => {
    if (!overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging) {
      // 拖动现有辅助线
      const newPosition = dragging.guideline.type === 'horizontal' 
        ? y - dragging.offset 
        : x - dragging.offset;
      
      updateGuidelinePosition(dragging.guideline.id, Math.max(0, newPosition));
    } else if (isCreating) {
      // 正在创建新辅助线
      overlayRef.current.style.cursor = 'crosshair';
    }
  }, [dragging, isCreating, updateGuidelinePosition]);

  const handleMouseUp = useCallback((e) => {
    if (!overlayRef.current) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isCreating) {
      // 创建新辅助线
      if (isCreating.type === 'horizontal' && y > 20) {
        addGuideline('horizontal', y);
      } else if (isCreating.type === 'vertical' && x > 20) {
        addGuideline('vertical', x);
      }
      setIsCreating(null);
      overlayRef.current.style.cursor = '';
    }

    setDragging(null);
  }, [isCreating, addGuideline]);

  // 双击删除辅助线
  const handleDoubleClick = useCallback((e) => {
    if (!showGuidelines) return;
    
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const hitGuideline = guidelines.find(g => {
      if (g.type === 'horizontal') {
        return Math.abs(y - g.position) < 5;
      } else {
        return Math.abs(x - g.position) < 5;
      }
    });

    if (hitGuideline) {
      removeGuideline(hitGuideline.id);
    }
  }, [guidelines, removeGuideline, showGuidelines]);

  // 渲染辅助线
  useEffect(() => {
    if (!overlayRef.current || !showGuidelines) return;

    const canvas = overlayRef.current;
    const ctx = canvas.getContext('2d');
    
    // 设置高DPI支持
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // 清除画布
    ctx.clearRect(0, 0, width, height);

    // 绘制辅助线
    guidelines.forEach(guideline => {
      if (!guideline.visible) return;

      ctx.save();
      ctx.strokeStyle = guideline.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.8;

      ctx.beginPath();
      if (guideline.type === 'horizontal') {
        ctx.moveTo(0, guideline.position);
        ctx.lineTo(width, guideline.position);
      } else {
        ctx.moveTo(guideline.position, 0);
        ctx.lineTo(guideline.position, height);
      }
      ctx.stroke();
      ctx.restore();

      // 绘制拖拽手柄
      ctx.save();
      ctx.fillStyle = guideline.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      if (guideline.type === 'horizontal') {
        const handleX = 10;
        const handleY = guideline.position;
        ctx.beginPath();
        ctx.arc(handleX, handleY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const handleX = guideline.position;
        const handleY = 10;
        ctx.beginPath();
        ctx.arc(handleX, handleY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });

    // 绘制正在创建的辅助线
    if (isCreating) {
      ctx.save();
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.globalAlpha = 0.5;
      
      ctx.beginPath();
      if (isCreating.type === 'horizontal') {
        ctx.moveTo(0, isCreating.startY);
        ctx.lineTo(width, isCreating.startY);
      } else {
        ctx.moveTo(isCreating.startX, 0);
        ctx.lineTo(isCreating.startX, height);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, [guidelines, width, height, showGuidelines, isCreating]);

  // 计算对象到辅助线的吸附
  const getSnapPosition = useCallback((obj, tolerance = 10) => {
    if (!showGuidelines || guidelines.length === 0) return null;

    const objBounds = {
      left: obj.left,
      top: obj.top,
      right: obj.left + obj.width * obj.scaleX,
      bottom: obj.top + obj.height * obj.scaleY,
      centerX: obj.left + (obj.width * obj.scaleX) / 2,
      centerY: obj.top + (obj.height * obj.scaleY) / 2
    };

    let snapX = null;
    let snapY = null;
    let minDistanceX = tolerance;
    let minDistanceY = tolerance;

    guidelines.forEach(guideline => {
      if (!guideline.visible) return;

      if (guideline.type === 'vertical') {
        // 检查垂直辅助线
        const distances = [
          Math.abs(objBounds.left - guideline.position),
          Math.abs(objBounds.right - guideline.position),
          Math.abs(objBounds.centerX - guideline.position)
        ];
        
        const minDist = Math.min(...distances);
        if (minDist < minDistanceX) {
          minDistanceX = minDist;
          if (distances[0] === minDist) {
            snapX = { type: 'left', position: guideline.position };
          } else if (distances[1] === minDist) {
            snapX = { type: 'right', position: guideline.position };
          } else {
            snapX = { type: 'center', position: guideline.position };
          }
        }
      } else {
        // 检查水平辅助线
        const distances = [
          Math.abs(objBounds.top - guideline.position),
          Math.abs(objBounds.bottom - guideline.position),
          Math.abs(objBounds.centerY - guideline.position)
        ];
        
        const minDist = Math.min(...distances);
        if (minDist < minDistanceY) {
          minDistanceY = minDist;
          if (distances[0] === minDist) {
            snapY = { type: 'top', position: guideline.position };
          } else if (distances[1] === minDist) {
            snapY = { type: 'bottom', position: guideline.position };
          } else {
            snapY = { type: 'center', position: guideline.position };
          }
        }
      }
    });

    return { snapX, snapY };
  }, [guidelines, showGuidelines]);

  // 设置画布对象的吸附事件
  useEffect(() => {
    if (!canvas || !showGuidelines) return;

    const handleObjectMoving = (e) => {
      const obj = e.target;
      const snap = getSnapPosition(obj);
      
      if (snap.snapX) {
        switch (snap.snapX.type) {
          case 'left':
            obj.set({ left: snap.snapX.position });
            break;
          case 'right':
            obj.set({ left: snap.snapX.position - obj.width * obj.scaleX });
            break;
          case 'center':
            obj.set({ left: snap.snapX.position - (obj.width * obj.scaleX) / 2 });
            break;
        }
      }
      
      if (snap.snapY) {
        switch (snap.snapY.type) {
          case 'top':
            obj.set({ top: snap.snapY.position });
            break;
          case 'bottom':
            obj.set({ top: snap.snapY.position - obj.height * obj.scaleY });
            break;
          case 'center':
            obj.set({ top: snap.snapY.position - (obj.height * obj.scaleY) / 2 });
            break;
        }
      }
    };

    canvas.on('object:moving', handleObjectMoving);

    return () => {
      canvas.off('object:moving', handleObjectMoving);
    };
  }, [canvas, getSnapPosition, showGuidelines]);

  if (!showGuidelines) return null;

  return (
    <canvas
      ref={overlayRef}
      className={`absolute top-0 left-0 z-20 ${className || ''}`}
      style={{ width, height, cursor: dragging ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    />
  );
};

export default GuidelineManager;