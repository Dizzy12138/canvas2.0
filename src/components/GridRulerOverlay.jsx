import React, { useEffect, useMemo, useRef } from 'react';

const clampNumber = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

export const computeGridBackgroundStyle = ({
  showGrid,
  width,
  height,
  gridSize,
  gridOpacity,
  scale,
  panX,
  panY
}) => {
  if (!showGrid || width <= 0 || height <= 0) {
    return { display: 'none' };
  }

  const safeScale = Math.max(clampNumber(scale, 1), 0.01);
  const baseGridSize = Math.max(1, Math.abs(clampNumber(gridSize, 20)) * safeScale);
  const majorGridSize = baseGridSize * 5;

  const scaledPanX = clampNumber(panX) * safeScale;
  const scaledPanY = clampNumber(panY) * safeScale;

  const offsetX = ((scaledPanX % baseGridSize) + baseGridSize) % baseGridSize;
  const offsetY = ((scaledPanY % baseGridSize) + baseGridSize) % baseGridSize;
  const majorOffsetX = ((scaledPanX % majorGridSize) + majorGridSize) % majorGridSize;
  const majorOffsetY = ((scaledPanY % majorGridSize) + majorGridSize) % majorGridSize;

  const minorOpacity = Math.min(Math.max(gridOpacity, 0.05), 1);
  const majorOpacity = Math.min(minorOpacity * 1.6, 1);

  const minorColor = `rgba(0, 0, 0, ${minorOpacity})`;
  const majorColor = `rgba(0, 0, 0, ${majorOpacity})`;

  const gridImage = (direction, color, step) =>
    `repeating-linear-gradient(${direction}, ${color} 0px, ${color} 1px, transparent 1px, transparent ${step}px)`;

  return {
    backgroundImage: [
      gridImage('to right', minorColor, baseGridSize),
      gridImage('to bottom', minorColor, baseGridSize),
      gridImage('to right', majorColor, majorGridSize),
      gridImage('to bottom', majorColor, majorGridSize)
    ].join(','),
    backgroundSize: `${baseGridSize}px ${baseGridSize}px, ${baseGridSize}px ${baseGridSize}px, ${majorGridSize}px ${majorGridSize}px, ${majorGridSize}px ${majorGridSize}px`,
    backgroundPosition: `${-offsetX}px 0px, 0px ${-offsetY}px, ${-majorOffsetX}px 0px, 0px ${-majorOffsetY}px`,
    backgroundRepeat: 'repeat',
    backgroundColor: 'transparent',
    willChange: 'background-position'
  };
};

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
  const rulerCanvasRef = useRef(null);
  const panX = clampNumber(pan?.x);
  const panY = clampNumber(pan?.y);
  const canvasWidth = clampNumber(width, 0);
  const canvasHeight = clampNumber(height, 0);

  const gridBackgroundStyle = useMemo(() =>
    computeGridBackgroundStyle({
      showGrid,
      width: canvasWidth,
      height: canvasHeight,
      gridSize,
      gridOpacity,
      scale,
      panX,
      panY
    }),
  [showGrid, canvasWidth, canvasHeight, gridSize, gridOpacity, scale, panX, panY]);

  useEffect(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas) return;

    if (!showRuler || canvasWidth <= 0 || canvasHeight <= 0) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * devicePixelRatio;
    canvas.height = canvasHeight * devicePixelRatio;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawRuler(ctx, canvasWidth, canvasHeight, rulerThickness, scale, { x: panX, y: panY });
  }, [canvasWidth, canvasHeight, showRuler, rulerThickness, scale, panX, panY]);

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

  if (!showGrid && !showRuler) {
    return null;
  }

  return (
    <div
      className={`absolute top-0 left-0 pointer-events-none z-10 ${className || ''}`}
      style={{ width: canvasWidth, height: canvasHeight }}
      data-testid="grid-ruler-overlay"
    >
      {showGrid && (
        <div
          className="absolute inset-0"
          style={gridBackgroundStyle}
          data-testid="grid-ruler-overlay-grid"
        />
      )}
      {showRuler && (
        <canvas
          ref={rulerCanvasRef}
          className="absolute top-0 left-0"
          style={{ width: canvasWidth, height: canvasHeight }}
          data-testid="grid-ruler-overlay-ruler"
        />
      )}
    </div>
  );
};

export default GridRulerOverlay;
