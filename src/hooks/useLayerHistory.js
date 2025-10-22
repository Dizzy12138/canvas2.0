import { useState, useCallback, useRef } from 'react';
import { getCompleteDiff, applyDiff } from '../utils/layerDiff';

export function useLayerHistory(maxHistoryLength = 50) {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isTracking, setIsTracking] = useState(true);
  const lastSnapshotRef = useRef(null);

  // 创建快照
  const createSnapshot = useCallback((layers, layerGroups, masks) => {
    return {
      layers: JSON.parse(JSON.stringify(layers)),
      layerGroups: JSON.parse(JSON.stringify(layerGroups)),
      masks: JSON.parse(JSON.stringify(masks)),
      timestamp: Date.now()
    };
  }, []);

  // 保存历史记录
  const save = useCallback((layers, layerGroups, masks) => {
    if (!isTracking) return;

    // 创建当前状态快照
    const snapshot = createSnapshot(layers, layerGroups, masks);
    
    // 如果与上一个快照相同，则不保存
    if (lastSnapshotRef.current && 
        JSON.stringify(lastSnapshotRef.current) === JSON.stringify(snapshot)) {
      return;
    }
    
    lastSnapshotRef.current = snapshot;

    setHistory(prev => {
      // 如果当前不在历史记录的末尾，删除后续的历史记录
      const newHistory = currentIndex === -1 
        ? [] 
        : prev.slice(0, currentIndex + 1);
      
      // 添加新的历史记录
      newHistory.push(snapshot);
      
      // 限制历史记录长度
      if (newHistory.length > maxHistoryLength) {
        newHistory.shift();
      }
      
      return newHistory;
    });
    
    setCurrentIndex(prev => {
      const newIndex = currentIndex === -1 
        ? 0 
        : Math.min(prev + 1, maxHistoryLength - 1);
      return newIndex;
    });
  }, [currentIndex, isTracking, maxHistoryLength, createSnapshot]);

  // 撤销
  const undo = useCallback(() => {
    if (currentIndex <= 0) return null;
    
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    
    return history[newIndex];
  }, [currentIndex, history]);

  // 重做
  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) return null;
    
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    
    return history[newIndex];
  }, [currentIndex, history]);

  // 跳转到指定历史记录
  const goTo = useCallback((index) => {
    if (index < 0 || index >= history.length) return null;
    
    setCurrentIndex(index);
    return history[index];
  }, [history]);

  // 获取历史记录列表
  const getHistoryList = useCallback(() => {
    return history.map((snapshot, index) => ({
      index,
      timestamp: snapshot.timestamp,
      isActive: index === currentIndex
    }));
  }, [history, currentIndex]);

  // 清除历史记录
  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
    lastSnapshotRef.current = null;
  }, []);

  // 暂停历史记录跟踪
  const pauseTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  // 恢复历史记录跟踪
  const resumeTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  // 比较两个状态的差异
  const getDiff = useCallback((state1, state2) => {
    return getCompleteDiff(state1, state2);
  }, []);

  // 获取两个历史记录之间的差异
  const getHistoryDiff = useCallback((fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= history.length || 
        toIndex < 0 || toIndex >= history.length) {
      return null;
    }
    
    return getDiff(history[fromIndex], history[toIndex]);
  }, [history, getDiff]);

  // 应用差异到当前状态
  const applyDiffToCurrent = useCallback((diff) => {
    if (currentIndex === -1 || currentIndex >= history.length) return null;
    
    const currentState = history[currentIndex];
    const newState = applyDiff(currentState, diff);
    
    return newState;
  }, [currentIndex, history]);

  return {
    // 状态
    history,
    currentIndex,
    isTracking,
    
    // 操作方法
    save,
    undo,
    redo,
    goTo,
    clear,
    pauseTracking,
    resumeTracking,
    
    // 查询方法
    getHistoryList,
    getDiff,
    getHistoryDiff,
    applyDiffToCurrent,
    
    // 历史状态
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    hasHistory: history.length > 0
  };
}