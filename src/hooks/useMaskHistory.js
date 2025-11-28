import { useState, useCallback, useRef } from 'react';

/**
 * 遮罩绘制历史管理 Hook
 * 专门用于管理涂抹工具的撤销/重做
 */
export const useMaskHistory = (maxHistorySize = 50) => {
  // 存储每个笔画的状态
  const [strokes, setStrokes] = useState([]);
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(-1);
  
  // 用于临时存储当前正在绘制的笔画
  const currentStrokeRef = useRef(null);

  /**
   * 开始新笔画
   */
  const beginStroke = useCallback(() => {
    currentStrokeRef.current = {
      points: [],
      timestamp: Date.now()
    };
  }, []);

  /**
   * 添加点到当前笔画
   */
  const addPointToStroke = useCallback((point) => {
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push(point);
    }
  }, []);

  /**
   * 完成当前笔画并添加到历史
   */
  const endStroke = useCallback((strokeData = {}) => {
    if (!currentStrokeRef.current || currentStrokeRef.current.points.length === 0) {
      currentStrokeRef.current = null;
      return null;
    }

    const newStroke = {
      ...currentStrokeRef.current,
      ...strokeData
    };

    setStrokes(prevStrokes => {
      // 如果当前不在最新状态，删除后面的历史
      const validStrokes = currentStrokeIndex >= 0 
        ? prevStrokes.slice(0, currentStrokeIndex + 1)
        : [];
      
      // 添加新笔画
      const updatedStrokes = [...validStrokes, newStroke];
      
      // 限制历史大小
      if (updatedStrokes.length > maxHistorySize) {
        return updatedStrokes.slice(updatedStrokes.length - maxHistorySize);
      }
      
      return updatedStrokes;
    });

    setCurrentStrokeIndex(prev => {
      const newIndex = currentStrokeIndex >= 0 
        ? currentStrokeIndex + 1 
        : 0;
      return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
    });

    currentStrokeRef.current = null;
    return newStroke;
  }, [currentStrokeIndex, maxHistorySize]);

  /**
   * 撤销最后一个笔画
   */
  const undo = useCallback(() => {
    if (currentStrokeIndex < 0) return null;

    const newIndex = currentStrokeIndex - 1;
    setCurrentStrokeIndex(newIndex);

    // 返回撤销后的所有笔画
    return newIndex >= 0 ? strokes.slice(0, newIndex + 1) : [];
  }, [currentStrokeIndex, strokes]);

  /**
   * 重做下一个笔画
   */
  const redo = useCallback(() => {
    if (currentStrokeIndex >= strokes.length - 1) return null;

    const newIndex = currentStrokeIndex + 1;
    setCurrentStrokeIndex(newIndex);

    // 返回重做后的所有笔画
    return strokes.slice(0, newIndex + 1);
  }, [currentStrokeIndex, strokes]);

  /**
   * 清除所有历史
   */
  const clear = useCallback(() => {
    setStrokes([]);
    setCurrentStrokeIndex(-1);
    currentStrokeRef.current = null;
  }, []);

  /**
   * 获取当前有效的所有笔画
   */
  const getValidStrokes = useCallback(() => {
    if (currentStrokeIndex < 0) return [];
    return strokes.slice(0, currentStrokeIndex + 1);
  }, [currentStrokeIndex, strokes]);

  /**
   * 检查是否可以撤销
   */
  const canUndo = currentStrokeIndex >= 0;

  /**
   * 检查是否可以重做
   */
  const canRedo = currentStrokeIndex < strokes.length - 1;

  return {
    // 状态
    strokes: getValidStrokes(),
    currentStrokeIndex,
    canUndo,
    canRedo,
    totalStrokes: strokes.length,
    
    // 方法
    beginStroke,
    addPointToStroke,
    endStroke,
    undo,
    redo,
    clear,
    getValidStrokes
  };
};

export default useMaskHistory;

