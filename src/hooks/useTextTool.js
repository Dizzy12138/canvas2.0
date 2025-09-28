import { useState, useCallback, useRef } from 'react';

export function useTextTool({ screenToCanvas, addObject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [textInput, setTextInput] = useState({
    x: 0,
    y: 0,
    text: '',
    style: {
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left'
    }
  });
  const inputRef = useRef(null);

  // 开始文本编辑
  const startTextEdit = useCallback((e) => {
    const point = screenToCanvas(e.clientX, e.clientY);
    
    setTextInput({
      x: point.x,
      y: point.y,
      text: '',
      style: {
        fontSize: 16,
        fontFamily: 'Arial',
        color: '#000000',
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign: 'left'
      }
    });
    
    setIsEditing(true);
    
    // 在下一个渲染周期聚焦输入框
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, [screenToCanvas]);

  // 更新文本内容
  const updateText = useCallback((text) => {
    setTextInput(prev => ({
      ...prev,
      text
    }));
  }, []);

  // 更新文本样式
  const updateTextStyle = useCallback((styleUpdates) => {
    setTextInput(prev => ({
      ...prev,
      style: {
        ...prev.style,
        ...styleUpdates
      }
    }));
  }, []);

  // 完成文本编辑
  const finishTextEdit = useCallback((style = {}) => {
    if (!isEditing || !textInput.text.trim()) {
      setIsEditing(false);
      return;
    }

    // 创建文本对象
    const textObject = {
      id: `text-${Date.now()}`,
      type: 'text',
      points: [{ x: textInput.x, y: textInput.y }],
      text: textInput.text,
      style: {
        ...textInput.style,
        strokeColor: style.strokeColor || textInput.style.color,
        fillColor: style.fillColor || textInput.style.color,
        ...style
      },
      timestamp: Date.now()
    };

    addObject(textObject);
    setIsEditing(false);
    setTextInput(prev => ({ ...prev, text: '' }));
  }, [isEditing, textInput, addObject]);

  // 取消文本编辑
  const cancelTextEdit = useCallback(() => {
    setIsEditing(false);
    setTextInput(prev => ({ ...prev, text: '' }));
  }, []);

  // 处理键盘事件
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishTextEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelTextEdit();
    }
  }, [finishTextEdit, cancelTextEdit]);

  // 计算文本框位置（屏幕坐标）
  const getInputPosition = useCallback((canvasRef, transform) => {
    if (!canvasRef.current || !isEditing) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const x = rect.left + textInput.x * transform.scale + transform.x;
    const y = rect.top + textInput.y * transform.scale + transform.y;

    return { x, y };
  }, [isEditing, textInput.x, textInput.y]);

  return {
    isEditing,
    textInput,
    inputRef,
    startTextEdit,
    updateText,
    updateTextStyle,
    finishTextEdit,
    cancelTextEdit,
    handleKeyDown,
    getInputPosition
  };
}