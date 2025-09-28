import { useState, useCallback, useRef } from 'react';

export function useSelection({ screenToCanvas, layers, activeLayerId }) {
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // 检查点是否在对象内
  const isPointInObject = useCallback((point, object) => {
    if (!object.points || object.points.length === 0) return false;

    switch (object.type) {
      case 'brush':
      case 'pencil':
        // 检查点是否在路径附近
        return object.points.some(p => {
          const distance = Math.sqrt(
            Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2)
          );
          return distance <= (object.style?.strokeWidth || 3);
        });

      case 'rectangle':
        if (object.points.length < 2) return false;
        const [start, end] = object.points;
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const bottom = Math.max(start.y, end.y);
        return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;

      case 'circle':
        if (object.points.length < 2) return false;
        const [center, edge] = object.points;
        const radius = Math.sqrt(
          Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2)
        );
        const distance = Math.sqrt(
          Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
        );
        return distance <= radius;

      default:
        return false;
    }
  }, []);

  // 查找点击位置的对象
  const findObjectAtPoint = useCallback((point) => {
    const activeLayer = layers.find(layer => layer.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return null;

    // 从后向前查找（最上层的对象优先）
    for (let i = activeLayer.objects.length - 1; i >= 0; i--) {
      const object = activeLayer.objects[i];
      if (isPointInObject(point, object)) {
        return { ...object, layerId: activeLayerId, index: i };
      }
    }
    return null;
  }, [layers, activeLayerId, isPointInObject]);

  // 开始选择
  const handleSelectionStart = useCallback((e) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    const clickedObject = findObjectAtPoint(point);

    if (clickedObject) {
      // 点击了对象
      if (!e.shiftKey) {
        // 非Shift点击，替换选择
        setSelectedObjects([clickedObject]);
      } else {
        // Shift点击，切换选择
        setSelectedObjects(prev => {
          const exists = prev.find(obj => 
            obj.id === clickedObject.id && obj.layerId === clickedObject.layerId
          );
          if (exists) {
            return prev.filter(obj => 
              !(obj.id === clickedObject.id && obj.layerId === clickedObject.layerId)
            );
          } else {
            return [...prev, clickedObject];
          }
        });
      }
      setIsDragging(true);
      setDragStart(point);
    } else {
      // 点击了空白区域
      if (!e.shiftKey) {
        setSelectedObjects([]);
      }
      // 开始框选
      setIsSelecting(true);
      setSelectionBox({
        start: point,
        end: point
      });
    }
  }, [screenToCanvas, findObjectAtPoint]);

  // 选择移动
  const handleSelectionMove = useCallback((e) => {
    const point = screenToCanvas(e.clientX, e.clientY);

    if (isSelecting && selectionBox) {
      // 更新选择框
      setSelectionBox(prev => ({
        ...prev,
        end: point
      }));
    } else if (isDragging && dragStart && selectedObjects.length > 0) {
      // 拖拽移动对象
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      
      // TODO: 实现对象移动逻辑
      console.log('移动对象:', deltaX, deltaY);
    }
  }, [screenToCanvas, isSelecting, selectionBox, isDragging, dragStart, selectedObjects]);

  // 结束选择
  const handleSelectionEnd = useCallback(() => {
    if (isSelecting && selectionBox) {
      // 框选结束，查找框选范围内的对象
      const { start, end } = selectionBox;
      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);

      const activeLayer = layers.find(layer => layer.id === activeLayerId);
      if (activeLayer) {
        const objectsInBox = activeLayer.objects.filter(object => {
          if (!object.points || object.points.length === 0) return false;
          
          // 检查对象是否与选择框相交
          return object.points.some(point => 
            point.x >= left && point.x <= right && 
            point.y >= top && point.y <= bottom
          );
        }).map((object, index) => ({
          ...object,
          layerId: activeLayerId,
          index
        }));

        setSelectedObjects(prev => [...prev, ...objectsInBox]);
      }
    }

    // 重置状态
    setIsSelecting(false);
    setSelectionBox(null);
    setIsDragging(false);
    setDragStart(null);
  }, [isSelecting, selectionBox, layers, activeLayerId]);

  // 清除选择
  const clearSelection = useCallback(() => {
    setSelectedObjects([]);
  }, []);

  // 删除选中的对象
  const deleteSelected = useCallback(() => {
    if (selectedObjects.length === 0) return [];

    const deletions = selectedObjects.map(obj => ({
      layerId: obj.layerId,
      objectId: obj.id
    }));

    setSelectedObjects([]);
    return deletions;
  }, [selectedObjects]);

  // 复制选中的对象
  const copySelected = useCallback(() => {
    return selectedObjects.map(obj => ({
      ...obj,
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      points: obj.points.map(point => ({ ...point }))
    }));
  }, [selectedObjects]);

  return {
    selectedObjects,
    selectionBox,
    isSelecting,
    isDragging,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
    clearSelection,
    deleteSelected,
    copySelected,
    setSelectedObjects
  };
}