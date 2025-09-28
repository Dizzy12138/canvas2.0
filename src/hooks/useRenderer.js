import { useCallback } from 'react';

export function useRenderer({ canvasRef, layers, transform, drawing }) {
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 保存上下文状态
    ctx.save();
    
    // 重置变换并清除画布
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置缩放和变换
    ctx.scale(dpr, dpr);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    // 网格
    if (transform.scale > 0.5) {
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1 / transform.scale;
      const gridSize = 20;
      const startX = Math.floor(-transform.x / transform.scale / gridSize) * gridSize;
      const startY = Math.floor(-transform.y / transform.scale / gridSize) * gridSize;
      const endX = startX + (canvas.width / dpr / transform.scale) + gridSize * 2;
      const endY = startY + (canvas.height / dpr / transform.scale) + gridSize * 2;

      for (let x = startX; x < endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      for (let y = startY; y < endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
    }

    // 图层
    layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.globalAlpha = layer.opacity;
      layer.objects.forEach(obj => {
        if (!obj.points || obj.points.length === 0) return;
        ctx.strokeStyle = obj.style.strokeColor;
        ctx.fillStyle = obj.style.fillColor;
        ctx.lineWidth = obj.style.strokeWidth / transform.scale;
        ctx.globalCompositeOperation = obj.type === 'eraser' ? 'destination-out' : 'source-over';

        if (['brush', 'pencil', 'eraser'].includes(obj.type)) {
          ctx.beginPath();
          ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            ctx.lineTo(obj.points[i].x, obj.points[i].y);
          }
          ctx.stroke();
        } else if (obj.type === 'rectangle') {
          const [start, end] = obj.points;
          ctx.beginPath();
          ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
          if (obj.style.fillColor !== 'transparent') ctx.fill();
          ctx.stroke();
        } else if (obj.type === 'circle') {
          const [start, end] = obj.points;
          const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          ctx.beginPath();
          ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
          if (obj.style.fillColor !== 'transparent') ctx.fill();
          ctx.stroke();
        }
      });
    });

    // 当前 stroke
    if (drawing.isDrawing && drawing.currentStroke.length > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawing.strokeColor;
      ctx.fillStyle = drawing.fillColor;
      ctx.lineWidth = drawing.brushSize / transform.scale;

      if (['brush', 'pencil'].includes(drawing.activeTool)) {
        ctx.beginPath();
        ctx.moveTo(drawing.currentStroke[0].x, drawing.currentStroke[0].y);
        for (let i = 1; i < drawing.currentStroke.length; i++) {
          ctx.lineTo(drawing.currentStroke[i].x, drawing.currentStroke[i].y);
        }
        ctx.stroke();
      } else if (drawing.activeTool === 'rectangle' && drawing.currentStroke.length === 2) {
        const [start, end] = drawing.currentStroke;
        ctx.beginPath();
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        if (drawing.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (drawing.activeTool === 'circle' && drawing.currentStroke.length === 2) {
        const [start, end] = drawing.currentStroke;
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        if (drawing.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [canvasRef, layers, transform, drawing]);

  return { renderCanvas };
}
