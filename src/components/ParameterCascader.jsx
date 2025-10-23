import React, { useState, useEffect, useRef } from 'react';

const ParameterCascader = ({ options, value, onChange, placeholder = '请选择参数', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [selectedPath, setSelectedPath] = useState([]); // 存储当前选择的路径，例如 ['KSampler', 'cfg']
  const cascaderRef = useRef(null);

  useEffect(() => {
    // 根据 value prop 初始化 selectedPath
    if (value) {
      const path = value.split('.'); // 例如 'KSampler.cfg' -> ['KSampler', 'cfg']
      setSelectedPath(path);
    } else {
      setSelectedPath([]);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cascaderRef.current && !cascaderRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option, level) => {
    const newPath = selectedPath.slice(0, level);
    newPath.push(option.value);
    setSelectedPath(newPath);

    if (!option.children || option.children.length === 0) {
      // 选择了叶子节点，完成选择
      onChange(option.value);
      setIsOpen(false);
    }
  };

  const matchesSearch = (option) => {
    if (!searchValue) return true;
    const keyword = searchValue.toLowerCase();
    if ((option.label || '').toLowerCase().includes(keyword)) {
      return true;
    }
    if (Array.isArray(option.children)) {
      return option.children.some(matchesSearch);
    }
    return false;
  };

  const renderOptions = (currentOptions, level) => {
    const filteredOptions = currentOptions.filter(matchesSearch);

    return (
      <ul className="min-w-[150px] max-h-60 overflow-y-auto bg-white border-r border-gray-200 py-1 shadow-sm">
        {filteredOptions.map((option) => (
          <li
            key={option.value}
            className={`px-4 py-2 text-sm cursor-pointer hover:bg-blue-500 hover:text-white 
              ${selectedPath[level] === option.value ? 'bg-blue-100 text-blue-800' : ''}`}
            onClick={() => handleSelect(option, level)}
          >
            {option.label}
            {option.children && option.children.length > 0 && (
              <span className="float-right">▶</span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const getDisplayValue = () => {
    if (value) {
      return value;
    }
    return selectedPath.length > 0 ? selectedPath.join(' -> ') : '';
  };

  return (
    <div className="relative" ref={cascaderRef}>
      <button
        type="button"
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm 
          ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {getDisplayValue() || placeholder}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 bg-white rounded-md shadow-lg flex border border-gray-200">
          {/* 搜索框 */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="搜索节点或参数..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
          {renderOptions(options, 0)}
          {selectedPath[0] && options.find(opt => opt.value === selectedPath[0])?.children && (
            renderOptions(options.find(opt => opt.value === selectedPath[0]).children, 1)
          )}
          {/* 可以根据需要添加更多层级的渲染 */}
        </div>
      )}
    </div>
  );
};

export default ParameterCascader;
