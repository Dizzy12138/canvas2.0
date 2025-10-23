import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

const flattenOptions = (options = [], ancestors = []) => {
  const flattened = [];

  options.forEach((option) => {
    const currentPath = [...ancestors, option];

    if (Array.isArray(option.children) && option.children.length > 0) {
      flattened.push(...flattenOptions(option.children, currentPath));
    } else {
      flattened.push({
        option,
        path: currentPath,
        value: option.value,
        node: currentPath[0] ?? option,
      });
    }
  });

  return flattened;
};

const findPathByValue = (value, options) => {
  if (!value) {
    return { node: null, leaf: null, path: [] };
  }

  const flattened = flattenOptions(options);
  const match = flattened.find((entry) => entry.value === value);

  if (!match) {
    return { node: null, leaf: null, path: [] };
  }

  const { node, option: leaf, path } = match;
  return { node, leaf, path };
};

const getNodeChildren = (nodeValue, options) => {
  if (!nodeValue) return [];
  const queue = [...options];

  while (queue.length) {
    const current = queue.shift();
    if (!current) continue;

    if (current.value === nodeValue) {
      return Array.isArray(current.children) ? current.children : [];
    }

    if (Array.isArray(current.children)) {
      queue.push(...current.children);
    }
  }

  return [];
};

const ParameterCascader = ({
  options = [],
  value,
  onChange,
  placeholder = '请选择参数',
  disabled = false,
  allowClear = true,
}) => {
  const cascaderRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeNodeValue, setActiveNodeValue] = useState(null);
  const [activeLeafValue, setActiveLeafValue] = useState(null);

  const selectedInfo = useMemo(
    () => findPathByValue(value, options),
    [value, options],
  );

  const flattenedLeaves = useMemo(() => flattenOptions(options), [options]);

  const filteredLeaves = useMemo(() => {
    if (!searchValue) return [];
    const keyword = searchValue.trim().toLowerCase();
    if (!keyword) return [];

    return flattenedLeaves.filter(({ path }) =>
      path.some((segment) => (segment.label || '').toLowerCase().includes(keyword)),
    );
  }, [searchValue, flattenedLeaves]);

  const activeChildren = useMemo(
    () => getNodeChildren(activeNodeValue, options),
    [activeNodeValue, options],
  );

  useEffect(() => {
    if (selectedInfo.node) {
      setActiveNodeValue(selectedInfo.node.value);
    }
    if (selectedInfo.leaf) {
      setActiveLeafValue(selectedInfo.leaf.value);
    } else {
      setActiveLeafValue(null);
    }
  }, [selectedInfo.node, selectedInfo.leaf]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cascaderRef.current && !cascaderRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchValue('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearchValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getDisplayLabel = useCallback(() => {
    if (!selectedInfo.path.length) return '';
    return selectedInfo.path.map((segment) => segment.label).join(' / ');
  }, [selectedInfo.path]);

  const handleLeafSelect = useCallback(
    (leafValue) => {
      if (!onChange) return;
      const match = findPathByValue(leafValue, options);
      setActiveNodeValue(match.node?.value || null);
      setActiveLeafValue(leafValue);
      onChange(leafValue);
      setIsOpen(false);
      setSearchValue('');
    },
    [onChange, options],
  );

  const handleClear = useCallback(() => {
    if (!onChange) return;
    onChange(null);
    setActiveLeafValue(null);
    setActiveNodeValue(null);
    setSearchValue('');
    setIsOpen(false);
  }, [onChange]);

  const handleTriggerClick = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setSearchValue('');
    if (!isOpen) {
      const nextNodeValue = selectedInfo.node?.value || options[0]?.value || null;
      setActiveNodeValue(nextNodeValue);
      if (selectedInfo.leaf) {
        setActiveLeafValue(selectedInfo.leaf.value);
      }
    }
  };

  const renderNodeColumn = () => (
    <ul className="min-w-[160px] max-h-60 overflow-y-auto border-r border-gray-200 py-1 text-sm">
      {options.map((option) => {
        const isActive = activeNodeValue === option.value;
        return (
          <li
            key={option.value}
            onMouseEnter={() => setActiveNodeValue(option.value)}
            onClick={() => setActiveNodeValue(option.value)}
            className={`flex cursor-pointer items-center justify-between px-4 py-2 transition-colors
              ${isActive ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-500 hover:text-white'}`}
          >
            <span className="truncate">{option.label}</span>
            {Array.isArray(option.children) && option.children.length > 0 && (
              <span className="ml-2 text-xs">▶</span>
            )}
          </li>
        );
      })}
    </ul>
  );

  const renderLeafColumn = () => {
    if (!activeChildren.length) {
      return (
        <div className="flex min-w-[200px] items-center justify-center px-4 py-6 text-sm text-gray-400">
          暂无可绑定参数
        </div>
      );
    }

    return (
      <ul className="min-w-[220px] max-h-60 overflow-y-auto py-1 text-sm">
        {activeChildren.map((child) => {
          const isSelected = activeLeafValue === child.value;
          return (
            <li
              key={child.value}
              onClick={() => handleLeafSelect(child.value)}
              className={`cursor-pointer px-4 py-2 transition-colors
                ${isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-blue-500 hover:text-white'}`}
            >
              <div className="truncate">{child.label}</div>
              {(child.type || child.default !== undefined) && (
                <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                  {child.type && <span>{child.type}</span>}
                  {child.default !== undefined && child.default !== null && (
                    <span className="truncate">默认: {String(child.default)}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const renderSearchResults = () => (
    <ul className="max-h-64 min-w-[320px] overflow-y-auto py-1 text-sm">
      {filteredLeaves.length === 0 && (
        <li className="px-4 py-3 text-center text-xs text-gray-400">未找到匹配的节点或参数</li>
      )}
      {filteredLeaves.map(({ value: leafValue, path }) => {
        const leaf = path[path.length - 1];
        const nodeLabel = path[0]?.label;
        const type = leaf?.type;
        const defaultValue = leaf?.default;

        return (
          <li
            key={leafValue}
            onClick={() => handleLeafSelect(leafValue)}
            className="cursor-pointer px-4 py-2 transition-colors hover:bg-blue-500 hover:text-white"
          >
            <div className="font-medium">{leaf?.label}</div>
            <div className="mt-1 text-xs text-gray-400">
              {nodeLabel && <span className="mr-2">节点: {nodeLabel}</span>}
              {type && <span className="mr-2">类型: {type}</span>}
              {defaultValue !== undefined && defaultValue !== null && (
                <span>默认: {String(defaultValue)}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="relative" ref={cascaderRef}>
      <button
        type="button"
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''}`}
        onClick={handleTriggerClick}
        disabled={disabled}
      >
        {getDisplayLabel() || placeholder}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-max min-w-[360px] overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-200 p-2">
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="搜索节点或参数..."
              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {searchValue ? (
            renderSearchResults()
          ) : (
            <div className="flex">
              {renderNodeColumn()}
              {renderLeafColumn()}
            </div>
          )}

          {allowClear && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 text-right">
              <button
                type="button"
                className="text-xs text-gray-500 transition-colors hover:text-red-500"
                onClick={handleClear}
              >
                清除绑定
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParameterCascader;
