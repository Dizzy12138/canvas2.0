import React, { useEffect, useRef } from 'react';

const GridRulerOverlay = ({ 
  width, 
  height, 
  showGrid = false, 
  showRuler = false,
  gridSize = 20,
  gridOpacity = 0.1,
  rulerThickness = 20,
  scale = 1,
  pan = { x: 0, y: 0 },
  className 
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    // 绘制网格
    if (showGrid) {
      drawGrid(ctx, width, height, gridSize, gridOpacity, scale, pan);
    }

    // 绘制标尺
    if (showRuler) {
      drawRuler(ctx, width, height, rulerThickness, scale, pan);
    }

  }, [width, height, showGrid, showRuler, gridSize, gridOpacity, rulerThickness, scale, pan]);

  const drawGrid = (ctx, canvasWidth, canvasHeight, size, opacity, currentScale, currentPan) => {
    ctx.save();
    
    // 设置网格样式
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    const effectiveGridSize = size * currentScale;
    const offsetX = (currentPan.x % effectiveGridSize + effectiveGridSize) % effectiveGridSize;
    const offsetY = (currentPan.y % effectiveGridSize + effectiveGridSize) % effectiveGridSize;

    // 绘制垂直线
    ctx.beginPath();
    for (let x = offsetX; x <= canvasWidth; x += effectiveGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
    }
    ctx.stroke();

    // 绘制水平线
    ctx.beginPath();
    for (let y = offsetY; y <= canvasHeight; y += effectiveGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
    }
    ctx.stroke();

    // 绘制主网格线（每5个网格一条粗线）
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 2})`;
    ctx.lineWidth = 1.5;
    
    const majorGridSize = effectiveGridSize * 5;
    const majorOffsetX = (currentPan.x % majorGridSize + majorGridSize) % majorGridSize;
    const majorOffsetY = (currentPan.y % majorGridSize + majorGridSize) % majorGridSize;

    ctx.beginPath();
    for (let x = majorOffsetX; x <= canvasWidth; x += majorGridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasHeight);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let y = majorOffsetY; y <= canvasHeight; y += majorGridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
    }
    ctx.stroke();

    ctx.restore();
  };

  const drawRuler = (ctx, canvasWidth, canvasHeight, thickness, currentScale, currentPan) => {
    ctx.save();

    // 标尺背景
    ctx.fillStyle = '#f8f9fa';
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;

    // 绘制水平标尺
    ctx.fillRect(thickness, 0, canvasWidth - thickness, thickness);
    ctx.strokeRect(thickness, 0, canvasWidth - thickness, thickness);

    // 绘制垂直标尺
    ctx.fillRect(0, thickness, thickness, canvasHeight - thickness);
    ctx.strokeRect(0, thickness, thickness, canvasHeight - thickness);

    // 绘制标尺交汇处
    ctx.fillRect(0, 0, thickness, thickness);
    ctx.strokeRect(0, 0, thickness, thickness);

    // 设置文字样式
    ctx.font = '10px monospace';
    ctx.fillStyle = '#495057';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 计算刻度间距
    const baseUnit = 10; // 基础单位：10像素
    const scaledUnit = baseUnit * currentScale;
    
    // 动态调整刻度密度
    let majorUnit = scaledUnit;
    let minorUnit = scaledUnit / 5;
    
    if (scaledUnit < 20) {
      majorUnit = scaledUnit * 5;
      minorUnit = scaledUnit;
    } else if (scaledUnit > 100) {
      majorUnit = scaledUnit / 2;
      minorUnit = scaledUnit / 10;
    }

    // 绘制水平标尺刻度
    const startX = Math.floor(-currentPan.x / majorUnit) * majorUnit + currentPan.x;
    for (let x = startX; x <= canvasWidth; x += majorUnit) {
      if (x >= thickness) {
        const realX = (x - currentPan.x) / currentScale;
        
        // 主刻度
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, thickness - 8);
        ctx.lineTo(x, thickness);
        ctx.stroke();

        // 刻度数字
        if (realX >= 0) {
          ctx.fillText(Math.round(realX).toString(), x, thickness / 2);
        }

        // 次刻度
        ctx.strokeStyle = '#adb5bd';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 5; i++) {
          const minorX = x + (majorUnit * i / 5);
          if (minorX <= canvasWidth && minorX >= thickness) {
            ctx.beginPath();
            ctx.moveTo(minorX, thickness - 4);
            ctx.lineTo(minorX, thickness);
            ctx.stroke();
          }
        }
      }
    }

    // 绘制垂直标尺刻度
    const startY = Math.floor(-currentPan.y / majorUnit) * majorUnit + currentPan.y;
    for (let y = startY; y <= canvasHeight; y += majorUnit) {
      if (y >= thickness) {
        const realY = (y - currentPan.y) / currentScale;
        
        // 主刻度
        ctx.strokeStyle = '#495057';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(thickness - 8, y);
        ctx.lineTo(thickness, y);
        ctx.stroke();

        // 刻度数字（垂直显示）
        if (realY >= 0) {
          ctx.save();
          ctx.translate(thickness / 2, y);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(Math.round(realY).toString(), 0, 0);
          ctx.restore();
        }

        // 次刻度
        ctx.strokeStyle = '#adb5bd';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 5; i++) {
          const minorY = y + (majorUnit * i / 5);
          if (minorY <= canvasHeight && minorY >= thickness) {
            ctx.beginPath();
            ctx.moveTo(thickness - 4, minorY);
            ctx.lineTo(thickness, minorY);
            ctx.stroke();
          }
        }
      }
    }

    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute top-0 left-0 pointer-events-none z-10 ${className || ''}`}
      style={{ width, height }}
    />
  );
};

export default GridRulerOverlay;