import { useState, useCallback, useRef } from 'react';

export function useTransform({ screenToCanvas }) {
  const [transformState, setTransformState] = useState({
    isTransforming: false,
    mode: null, // 'move', 'scale', 'rotate'
    startPoint: null,
    startTransform: null,
    selectedObjects: []
  });

  const transformRef = useRef({
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0
  });

  // 开始变换
  const startTransform = useCallback((mode, e, selectedObjects = []) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    
    setTransformState({
      isTransforming: true,
      mode,
      startPoint: point,
      startTransform: { ...transformRef.current },
      selectedObjects
    });
  }, [screenToCanvas]);

  // 更新变换
  const updateTransform = useCallback((e) => {
    if (!transformState.isTransforming || !transformState.startPoint) return;

    const currentPoint = screenToCanvas(e.clientX, e.clientY);
    const deltaX = currentPoint.x - transformState.startPoint.x;
    const deltaY = currentPoint.y - transformState.startPoint.y;

    switch (transformState.mode) {
      case 'move':
        transformRef.current = {
          ...transformState.startTransform,
          x: transformState.startTransform.x + deltaX,
          y: transformState.startTransform.y + deltaY
        };
        break;

      case 'scale':
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const scale = Math.max(0.1, 1 + distance / 100 * 0.1);
        
        transformRef.current = {
          ...transformState.startTransform,
          scaleX: transformState.startTransform.scaleX * scale,
          scaleY: transformState.startTransform.scaleY * scale
        };
        break;

      case 'rotate':
        const angle = Math.atan2(deltaY, deltaX);
        transformRef.current = {
          ...transformState.startTransform,
          rotation: transformState.startTransform.rotation + angle
        };
        break;
    }
  }, [transformState, screenToCanvas]);

  // 结束变换
  const endTransform = useCallback(() => {
    if (!transformState.isTransforming) return null;

    const result = {
      mode: transformState.mode,
      transform: { ...transformRef.current },
      selectedObjects: transformState.selectedObjects
    };

    setTransformState({
      isTransforming: false,
      mode: null,
      startPoint: null,
      startTransform: null,
      selectedObjects: []
    });

    return result;
  }, [transformState]);

  return {
    transformState,
    currentTransform: transformRef.current,
    startTransform,
    updateTransform,
    endTransform
  };
}