import { useState, useCallback } from 'react';

export function useHistory(limit = 50) {
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRecording, setIsRecording] = useState(true);

  const save = useCallback((state) => {
    if (!isRecording) return;
    setHistory(prev => {
      let newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      if (newHistory.length > limit) {
        newHistory.shift();
        setHistoryIndex(idx => Math.max(0, idx));
      } else {
        setHistoryIndex(idx => idx + 1);
      }
      return newHistory;
    });
  }, [isRecording, historyIndex, limit]);

  const undo = useCallback(() => {
    setHistoryIndex(idx => {
      if (idx > 0) {
        setIsRecording(false);
        return idx - 1;
      }
      return idx;
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex(idx => {
      setIsRecording(false);
      return Math.min(idx + 1, history.length - 1);
    });
  }, [history.length]);

  const current = historyIndex >= 0 ? history[historyIndex] : null;

  const resumeRecording = useCallback(() => setIsRecording(true), []);

  return {
    history,
    historyIndex,
    current,
    save,
    undo,
    redo,
    isRecording,
    resumeRecording
  };
}
