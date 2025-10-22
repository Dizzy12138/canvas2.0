import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Settings, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  Upload, 
  Download,
  Zap,
  Layers,
  GitBranch,
  FileText,
  Grid,
  Move,
  RotateCw,
  Copy,
  Scissors,
  Square,
  Circle,
  Type,
  Image as ImageIcon
} from 'lucide-react';
import clsx from 'clsx';
import './WorkflowDesigner.css';

const WorkflowDesigner = ({ 
  workflowData,
  onParameterChange,
  onSaveWorkflow,
  onLoadWorkflow,
  onGenerate,
  className 
}) => {
  const [parameters, setParameters] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [activeTab, setActiveTab] = useState('design');
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });

  // 初始化参数值
  useEffect(() => {
    if (workflowData && workflowData.data && workflowData.data.parameters) {
      const initialParams = {};
      Object.keys(workflowData.data.parameters).forEach(key => {
        initialParams[key] = workflowData.data.parameters[key].default;
      });
      setParameters(initialParams);
    } else {
      setParameters({});
    }
  }, [workflowData]);

  // 处理参数变化
  const handleParamChange = (key, value) => {
    const newParams = { ...parameters, [key]: value };
    setParameters(newParams);
    onParameterChange?.(newParams);
  };

  // 检查参数是否应该显示（基于条件）
  const shouldShowParameter = (param) => {
    if (!param.condition) return true;
    
    const { param: conditionParam, value: conditionValue, operator = "==" } = param.condition;
    const currentValue = parameters[conditionParam];
    
    switch (operator) {
      case "==":
        return currentValue === conditionValue;
      case "!=":
        return currentValue !== conditionValue;
      case ">":
        return currentValue > conditionValue;
      case "<":
        return currentValue < conditionValue;
      case ">=":
        return currentValue >= conditionValue;
      case "<=":
        return currentValue <= conditionValue;
      case "in":
        return Array.isArray(conditionValue) && conditionValue.includes(currentValue);
      case "not_in":
        return Array.isArray(conditionValue) && !conditionValue.includes(currentValue);
      default:
        return true;
    }
  };

  // 渲染参数控件
  const renderParameterControl = (key, param) => {
    const value = parameters[key] !== undefined ? parameters[key] : param.default;
    
    switch (param.type) {
      case 'number':
      case 'integer':
        if (param.min !== undefined && param.max !== undefined) {
          return (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{param.label || key}</span>
                <span>{value}</span>
              </div>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step || (param.type === 'integer' ? 1 : 0.1)}
                value={value}
                onChange={(e) => handleParamChange(key, param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>{param.min}</span>
                <span>{param.max}</span>
              </div>
            </div>
          );
        } else {
          return (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">{param.label || key}</label>
              <input
                type="number"
                step={param.step || (param.type === 'integer' ? 1 : 0.1)}
                value={value}
                onChange={(e) => handleParamChange(key, param.type === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          );
        }
      
      case 'string':
        if (param.options && Array.isArray(param.options)) {
          return (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">{param.label || key}</label>
              <select
                value={value}
                onChange={(e) => handleParamChange(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {param.options.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          );
        } else {
          return (
            <div className="space-y-1">
              <label className="text-xs text-gray-600">{param.label || key}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => handleParamChange(key, e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          );
        }
      
      case 'boolean':
        return (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">{param.label || key}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => handleParamChange(key, e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        );
      
      default:
        return (
          <div className="space-y-1">
            <label className="text-xs text-gray-600">{param.label || key}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleParamChange(key, e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        );
    }
  };

  // 处理画布拖拽
  const handleCanvasMouseDown = (e) => {
    if (e.target === e.currentTarget) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - canvasPosition.x,
        y: e.clientY - canvasPosition.y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isDragging) {
      setCanvasPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  // 如果没有工作流数据，显示空状态
  if (!workflowData) {
    return (
      <div className={clsx('flex flex-col h-full bg-gray-50', className)}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">工作流设计器</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <FileText size={64} className="text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">未选择工作流</h3>
          <p className="text-gray-500 text-center mb-6 max-w-md">
            请在AI生成面板中选择一个工作流，或上传自定义工作流文件来开始设计
          </p>
          <button
            onClick={onLoadWorkflow}
            className="flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Upload size={20} />
            <span>上传工作流</span>
          </button>
        </div>
      </div>
    );
  }

  const params = workflowData.data?.parameters || {};
  const nodes = workflowData.data?.nodes || [];

  return (
    <div className={clsx('flex flex-col h-full bg-gray-50', className)}>
      {/* 顶部工具栏 */}
      <div className="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">工作流设计器</h2>
          <div className="text-sm text-gray-500">
            {workflowData.name}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoomLevel(Math.max(25, zoomLevel - 25))}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="缩小"
          >
            <span className="text-xs">-</span>
          </button>
          <span className="text-xs text-gray-500 w-12 text-center">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="放大"
          >
            <span className="text-xs">+</span>
          </button>
          <button
            onClick={() => {
              setZoomLevel(100);
              setCanvasPosition({ x: 0, y: 0 });
            }}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            title="重置视图"
          >
            <RotateCw size={16} />
          </button>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧节点面板 */}
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">节点库</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="space-y-1">
              <button className="w-full flex items-center space-x-2 p-2 text-left rounded-lg hover:bg-gray-100">
                <Square size={16} className="text-blue-500" />
                <span className="text-sm">矩形</span>
              </button>
              <button className="w-full flex items-center space-x-2 p-2 text-left rounded-lg hover:bg-gray-100">
                <Circle size={16} className="text-green-500" />
                <span className="text-sm">圆形</span>
              </button>
              <button className="w-full flex items-center space-x-2 p-2 text-left rounded-lg hover:bg-gray-100">
                <Type size={16} className="text-purple-500" />
                <span className="text-sm">文本</span>
              </button>
              <button className="w-full flex items-center space-x-2 p-2 text-left rounded-lg hover:bg-gray-100">
                <ImageIcon size={16} className="text-yellow-500" />
                <span className="text-sm">图像</span>
              </button>
            </div>
          </div>
        </div>

        {/* 中间画布区域 */}
        <div className="flex-1 flex flex-col">
          {/* 标签页 */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 ${
                activeTab === 'design' 
                  ? 'text-primary-600 border-b-2 border-primary-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('design')}
            >
              <GitBranch size={16} />
              <span>设计</span>
            </button>
            <button
              className={`px-4 py-3 text-sm font-medium flex items-center space-x-2 ${
                activeTab === 'parameters' 
                  ? 'text-primary-600 border-b-2 border-primary-500' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('parameters')}
            >
              <Settings size={16} />
              <span>参数</span>
            </button>
          </div>

          {/* 画布内容 */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'design' ? (
              <div 
                className="w-full h-full bg-gray-100 relative overflow-hidden"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                {/* 网格背景 */}
                <div 
                  className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px]"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
                    transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoomLevel / 100})`,
                    transformOrigin: '0 0'
                  }}
                ></div>

                {/* 节点 */}
                <div 
                  className="absolute inset-0"
                  style={{
                    transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${zoomLevel / 100})`,
                    transformOrigin: '0 0'
                  }}
                >
                  {nodes.map((node, index) => (
                    <div
                      key={node.id}
                      className={clsx(
                        'absolute w-48 bg-white border rounded-lg shadow-sm cursor-pointer transition-all',
                        selectedNode === node.id 
                          ? 'border-primary-500 ring-2 ring-primary-200' 
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      style={{
                        left: index * 200 + 50,
                        top: 100,
                        transform: 'translate(-50%, -50%)'
                      }}
                      onClick={() => setSelectedNode(node.id)}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-sm font-medium text-gray-900">
                              {node.type}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">#{node.id}</span>
                        </div>
                        {node.properties && (
                          <div className="mt-2 text-xs text-gray-600">
                            {Object.entries(node.properties).map(([key, value]) => (
                              <div key={key} className="truncate">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 连接线 */}
                  <svg className="absolute inset-0 pointer-events-none">
                    {workflowData.data?.connections?.map((connection, index) => {
                      const fromNode = nodes.find(n => n.id === connection.from.node_id);
                      const toNode = nodes.find(n => n.id === connection.to.node_id);
                      if (!fromNode || !toNode) return null;
                      
                      const fromX = (index * 200 + 50) + 24;
                      const fromY = 100;
                      const toX = ((nodes.findIndex(n => n.id === toNode.id)) * 200 + 50) - 24;
                      const toY = 100;
                      
                      return (
                        <line
                          key={index}
                          x1={fromX}
                          y1={fromY}
                          x2={toX}
                          y2={toY}
                          stroke="#94a3b8"
                          strokeWidth="2"
                          markerEnd="url(#arrowhead)"
                        />
                      );
                    })}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="#94a3b8"
                        />
                      </marker>
                    </defs>
                  </svg>
                </div>

                {/* 状态信息 */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  缩放: {zoomLevel}% | 位置: ({canvasPosition.x}, {canvasPosition.y})
                </div>
              </div>
            ) : (
              // 参数设置面板
              <div className="h-full overflow-y-auto p-4">
                {Object.keys(params).length > 0 ? (
                  <div className="space-y-4">
                    {Object.keys(params).map(key => {
                      const param = params[key];
                      
                      // 条件渲染
                      if (!shouldShowParameter(param)) {
                        return null;
                      }
                      
                      return (
                        <div 
                          key={key} 
                          className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
                        >
                          {param.description && (
                            <div className="mb-3">
                              <div className="flex items-start">
                                <span className="text-sm font-medium text-gray-900 flex-1">
                                  {param.label || key}
                                </span>
                                <span className="text-xs text-gray-400 ml-2" title={param.description}>
                                  (?)
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">{param.description}</p>
                            </div>
                          )}
                          {renderParameterControl(key, param)}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <Settings size={48} className="text-gray-300 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">无参数</h4>
                    <p className="text-gray-500 max-w-md">
                      当前工作流未定义可编辑参数。您可以在工作流JSON中添加parameters字段来定义参数。
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧属性面板 */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              {activeTab === 'design' ? '属性' : '工作流信息'}
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'design' ? (
              selectedNode ? (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">节点属性</h4>
                    <div className="space-y-2 text-xs text-blue-800">
                      <div className="flex justify-between">
                        <span>ID:</span>
                        <span className="font-medium">#{selectedNode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>类型:</span>
                        <span className="font-medium">
                          {nodes.find(n => n.id === selectedNode)?.type || '未知'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">参数设置</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">名称</label>
                        <input
                          type="text"
                          defaultValue="节点名称"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">描述</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="节点描述..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <Layers size={32} className="text-gray-300 mb-3" />
                  <h4 className="text-sm font-medium text-gray-900 mb-1">未选择节点</h4>
                  <p className="text-xs text-gray-500">
                    请在画布中点击一个节点来查看和编辑其属性
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">工作流信息</h4>
                  <div className="space-y-2 text-xs text-blue-800">
                    <div className="flex justify-between">
                      <span>名称:</span>
                      <span className="font-medium">{workflowData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>类型:</span>
                      <span className="font-medium">
                        {workflowData.type === 'builtin' ? '内置' : '自定义'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>最后修改:</span>
                      <span className="font-medium">{workflowData.lastModified}</span>
                    </div>
                  </div>
                </div>

                {Object.keys(parameters).length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">当前参数值</h4>
                    <div className="space-y-2 text-xs">
                      {Object.keys(parameters).map(key => {
                        const param = params[key];
                        if (!param || !shouldShowParameter(param)) return null;
                        
                        return (
                          <div key={key} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                            <span className="text-gray-600">{param.label || key}:</span>
                            <span className="font-medium text-gray-900">
                              {typeof parameters[key] === 'boolean' 
                                ? parameters[key] ? '是' : '否' 
                                : parameters[key]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-sm font-medium text-green-900 mb-2">使用说明</h4>
                  <ul className="text-xs text-green-800 space-y-1">
                    <li>• 调整参数设置实时生效</li>
                    <li>• 参数值将应用于AI生成过程</li>
                    <li>• 条件参数会根据依赖关系自动显示/隐藏</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部状态栏 */}
      <div className="p-2 border-t border-gray-200 bg-white flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          <span>节点: {nodes.length}</span>
          <span>参数: {Object.keys(params).length}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onLoadWorkflow}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            <Upload size={14} />
            <span>上传</span>
          </button>
          <button
            onClick={onSaveWorkflow}
            className="flex items-center space-x-1 px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
          >
            <Save size={14} />
            <span>保存</span>
          </button>
          <button
            onClick={onGenerate}
            className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <Play size={14} />
            <span>生成</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowDesigner;