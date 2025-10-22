import { useState, useCallback } from 'react';
import { useSelection } from './useSelection';
import { useTextTool } from './useTextTool';
import { useTransform } from './useTransform';

export function useDrawing({ screenToCanvas, addObject, layers, activeLayerId }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [activeTool, setActiveTool] = useState('brush');

  // 集成高级工具
  const selection = useSelection({ screenToCanvas, layers, activeLayerId });
  const textTool = useTextTool({ screenToCanvas, addObject });
  const transform = useTransform({ screenToCanvas });

  const handlePointerDown = useCallback((e) => {
    // console.log('handlePointerDown called with tool:', activeTool);
    if (activeTool === 'select') {
      selection.handleSelectionStart(e);
    } else if (activeTool === 'text') {
      textTool.startTextEdit(e);
    } else if (['brush', 'pencil', 'eraser', 'rectangle', 'circle'].includes(activeTool)) {
      const point = screenToCanvas(e.clientX, e.clientY);
      // console.log('Drawing point:', point);
      setIsDrawing(true);
      setCurrentStroke([point]);
    }
  }, [activeTool, screenToCanvas, selection, textTool]);

  const handlePointerMove = useCallback((e) => {
    if (activeTool === 'select') {
      selection.handleSelectionMove(e);
    } else if (isDrawing) {
      const point = screenToCanvas(e.clientX, e.clientY);

      if (['brush', 'pencil', 'eraser'].includes(activeTool)) {
        setCurrentStroke(prev => [...prev, point]);
      } else if (['rectangle', 'circle'].includes(activeTool)) {
        setCurrentStroke(prev => [prev[0], point]);
      }
    }
  }, [isDrawing, activeTool, screenToCanvas, selection]);

  const handlePointerUp = useCallback((style) => {
    if (activeTool === 'select') {
      selection.handleSelectionEnd();
    } else if (isDrawing && currentStroke.length > 0) {
      const newObject = {
        id: `obj-${Date.now()}`,
        type: activeTool,
        points: [...currentStroke],
        style,
        timestamp: Date.now()
      };

      addObject(newObject);
      setIsDrawing(false);
      setCurrentStroke([]);
    }
  }, [isDrawing, currentStroke, activeTool, addObject, selection]);

  return {
    isDrawing,
    currentStroke,
    activeTool,
    setActiveTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    // 暴露高级工具功能
    selection,
    textTool,
    transform
  };
}
