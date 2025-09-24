import React, { useRef, useState, useEffect } from 'react';
import { useLayers } from '../hooks/useLayers';
import { useHistory } from '../hooks/useHistory';
import { useDrawing } from '../hooks/useDrawing';
import { useRenderer } from '../hooks/useRenderer';

const AICanvasTool = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const { layers, activeLayerId, setLayers, addLayer } = useLayers([
    { id: 'layer-1', name: '图层 1', visible: true, locked: false, opacity: 1, objects: [] }
  ]);
  const { save, current, resumeRecording } = useHistory(50);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [strokeColor, setStrokeColor] = useState('#000');
  const [fillColor, setFillColor] = useState('transparent');
  const [brushSize, setBrushSize] = useState(3);

  const screenToCanvas = (screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (screenX - rect.left - transform.x) / transform.scale;
    const y = (screenY - rect.top - transform.y) / transform.scale;
    return { x, y };
  };

  const addObject = (obj) => {
    setLayers(prev => prev.map(layer =>
      layer.id === activeLayerId ? { ...layer, objects: [...layer.objects, obj] } : layer
    ));
    save({ layers: JSON.parse(JSON.stringify(layers)), activeLayerId });
  };

  const drawing = useDrawing({ screenToCanvas, addObject });
  const { renderCanvas } = useRenderer({ canvasRef, layers, transform, drawing: { ...drawing, strokeColor, fillColor, brushSize } });

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div ref={containerRef} className="w-full h-screen bg-gray-50">
      <canvas ref={canvasRef} className="w-full h-full" 
        onMouseDown={drawing.handlePointerDown}
        onMouseMove={drawing.handlePointerMove}
        onMouseUp={() => drawing.handlePointerUp({
          strokeColor,
          fillColor: drawing.activeTool === 'eraser' ? 'transparent' : fillColor,
          strokeWidth: brushSize,
          opacity: drawing.activeTool === 'eraser' ? 0 : 1
        })}
      />
    </div>
  );
};

export default AICanvasTool;
