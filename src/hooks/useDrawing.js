import { useState, useCallback } from 'react';

export function useDrawing({ screenToCanvas, addObject }) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [activeTool, setActiveTool] = useState('select');

  const handlePointerDown = useCallback((e) => {
    if (['brush', 'pencil', 'eraser', 'rectangle', 'circle'].includes(activeTool)) {
      const point = screenToCanvas(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentStroke([point]);
    }
  }, [activeTool, screenToCanvas]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawing) return;
    const point = screenToCanvas(e.clientX, e.clientY);

    if (['brush', 'pencil', 'eraser'].includes(activeTool)) {
      setCurrentStroke(prev => [...prev, point]);
    } else if (['rectangle', 'circle'].includes(activeTool)) {
      setCurrentStroke(prev => [prev[0], point]);
    }
  }, [isDrawing, activeTool, screenToCanvas]);

  const handlePointerUp = useCallback((style) => {
    if (!isDrawing || currentStroke.length === 0) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

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
  }, [isDrawing, currentStroke, activeTool, addObject]);

  return {
    isDrawing,
    currentStroke,
    activeTool,
    setActiveTool,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp
  };
}
