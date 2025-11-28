import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Plus, 
  Settings, 
  Eye, 
  Upload, 
  Image, 
  Type, 
  Sliders, 
  ChevronDown,
  ChevronRight,
  Check,
  X,
  GripVertical
} from 'lucide-react';
import usePermissions from '@/hooks/usePermissions';
import useTranslation from "@/hooks/useTranslation";
import useAppBuilderStore from "@/store/useAppBuilderStore";
import useWorkflowStore from "@/store/useWorkflowStore";
import ParameterCascader from '@/components/ParameterCascader';
import api from '@/api/index.js';

// 组件类型定义
const COMPONENT_TYPES = {
  basic: {
    title: '基础',
    icon: <Settings className="w-4 h-4" />,
    components: [
      { type: 'width', label: '宽度', icon: '↔️', description: '设置宽度参数' },
      { type: 'height', label: '高度', icon: '↕️', description: '设置高度参数' },
      { type: 'seed', label: '随机种子', icon: '🎲', description: '随机种子控制' },
      { type: 'slider', label: '自定义数字滑块', icon: '🎚️', description: '数值滑块输入' },
      { type: 'number', label: '自定义数字', icon: '🔢', description: '数字输入框' },
      { type: 'text', label: '自定义文本', icon: '📝', description: '文本输入框' },
      { type: 'info', label: '自定义提示信息', icon: 'ℹ️', description: '信息提示组件' },
    ]
  },
  prompt: {
    title: '提示词',
    icon: <Type className="w-4 h-4" />,
    components: [
      { type: 'negative_prompt', label: '负向提示词', icon: '📍', description: '负面提示词输入' },
      { type: 'positive_prompt', label: '正向提示词', icon: '☀️', description: '正面提示词输入' },
      { type: 'prompt_template', label: '提示词模板', icon: '📋', description: '提示词模板选择', badge: 'Biz' },
    ]
  },
  selection: {
    title: '选择',
    icon: <Sliders className="w-4 h-4" />,
    components: [
      { type: 'model_select', label: '模型选择', icon: '🧊', description: 'AI模型选择器' },
      { type: 'lora_select', label: 'Lora选择', icon: '📶', description: 'Lora模型选择' },
      { type: 'image_preview', label: '高级-图像预览选择', icon: '👁️', description: '图像预览选择器', badge: 'Biz' },
      { type: 'tag_group_single', label: '高级-标签组-单选', icon: '🏷️', description: '标签组单选器', badge: 'Biz' },
      { type: 'tag_group_multi', label: '高级-标签组-多选', icon: '🏷️', description: '标签组多选器', badge: 'Biz' },
      { type: 'dropdown_text', label: '自定义下拉选择-文本', icon: '📋', description: '文本下拉选择器' },
      { type: 'dropdown_number', label: '自定义下拉选择-数字', icon: '📋', description: '数字下拉选择器' },
      { type: 'large_model_select', label: '高级-大模型选择', icon: '🧊', description: '大模型选择器' },
      { type: 'capability_model_select', label: '选择特定能力的模型', icon: '🧊', description: '能力模型选择器' },
    ]
  },
  image: {
    title: '图像',
    icon: <Image className="w-4 h-4" />,
    components: [
      { type: 'upload_multi_media', label: '上传(支持图片、音频与...)', icon: '📤', description: '多媒体文件上传' },
      { type: 'image_select', label: '图片选择(本地/素材库/...)', icon: '🖼️', description: '图片选择器' },
      { type: 'multi_image_single', label: '多图上传(单任务)', icon: '🖼️', description: '多图单任务上传' },
      { type: 'mask_edit', label: '遮罩编辑', icon: '🎭', description: '图像遮罩编辑器' },
      { type: 'multi_image_multi', label: '多图上传(单图多任务)', icon: '🖼️', description: '单图多任务上传' },
      { type: 'multi_image_multi2', label: '多图上传2(单图多任务)', icon: '🖼️', description: '单图多任务上传2' },
      { type: 'multi_image_bg', label: '高级-多图组合-背景图', icon: '🖼️', description: '多图背景组合', badge: 'Biz' },
      { type: 'image_merge', label: '图片合并', icon: '🔗', description: '图片合并工具' },
      { type: 'first_last_frame', label: '首尾帧', icon: '🎬', description: '首尾帧选择器' },
      { type: 'four_view', label: '四视图', icon: '📐', description: '四视图显示' },
    ]
  },
  color: {
    title: '颜色选择',
    icon: <Settings className="w-4 h-4" />,
    components: [
      { type: 'color_picker', label: '高级-颜色选择器', icon: '🎨', description: '高级颜色选择工具' },
    ]
  }
};

const COMPONENT_PROPERTY_CONFIG = {
  slider: [
    { key: 'min', label: '最小值', type: 'number', placeholder: '如 0', defaultValue: 0 },
    { key: 'max', label: '最大值', type: 'number', placeholder: '如 100', defaultValue: 100 },
    { key: 'step', label: '步长', type: 'number', placeholder: '如 1', defaultValue: 1 }
  ],
  number: [
    { key: 'min', label: '最小值', type: 'number', placeholder: '最小值', defaultValue: 0 },
    { key: 'max', label: '最大值', type: 'number', placeholder: '最大值', defaultValue: 1000 },
    { key: 'step', label: '步长', type: 'number', placeholder: '步长', defaultValue: 1 }
  ],
  width: [
    { key: 'min', label: '最小值', type: 'number', placeholder: '尺寸下限', defaultValue: 64 },
    { key: 'max', label: '最大值', type: 'number', placeholder: '尺寸上限', defaultValue: 2048 },
    { key: 'step', label: '步长', type: 'number', placeholder: '步长', defaultValue: 64 }
  ],
  height: [
    { key: 'min', label: '最小值', type: 'number', placeholder: '尺寸下限', defaultValue: 64 },
    { key: 'max', label: '最大值', type: 'number', placeholder: '尺寸上限', defaultValue: 2048 },
    { key: 'step', label: '步长', type: 'number', placeholder: '步长', defaultValue: 64 }
  ],
  dropdown_text: [
    { key: 'options', label: '选项列表', type: 'options', valueType: 'text' }
  ],
  dropdown_number: [
    { key: 'options', label: '选项列表', type: 'options', valueType: 'number' }
  ],
  dropdown: [
    { key: 'options', label: '选项列表', type: 'options', valueType: 'text' }
  ]
};

// 组件渲染器
const ComponentRenderer = ({ 
  component, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete, 
  onBindParam, 
  getBindingForComponent,
  parameterLookup
}) => {
  const { label, type, properties = {}, paramPath, defaultValue } = component;
  const binding = getBindingForComponent(component.id);
  
  const renderComponent = () => {
    switch (type) {
      case 'width':
      case 'height':
      case 'number':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={properties.placeholder || '请输入数值'}
              min={properties.min}
              max={properties.max}
              step={properties.step}
            />
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={properties.placeholder || '请输入文本'}
              maxLength={properties.maxLength}
            />
          </div>
        );
      
      case 'slider':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="space-y-1">
              <input
                type="range"
                min={properties.min || 0}
                max={properties.max || 100}
                step={properties.step || 1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{properties.min || 0}</span>
                <span>{properties.max || 100}</span>
              </div>
            </div>
          </div>
        );
      
      case 'positive_prompt':
      case 'negative_prompt':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="space-y-2">
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder={type === 'positive_prompt' ? '请输入正向提示词' : '请输入负向提示词'}
              />
              <button className="text-sm text-blue-600 hover:text-blue-800">AI润色</button>
            </div>
          </div>
        );
      
      case 'upload_image':
      case 'upload_single_image':
      case 'upload_multiple_images':
      case 'upload_multi_media': {
        const multiple = type === 'upload_multiple_images' || (properties?.multiple === true);
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            {/* 拖拽区域 */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors text-center bg-gray-50"
            >
              <input
                type="file"
                accept={properties?.acceptedTypes || 'image/*'}
                multiple={multiple}
                className="hidden"
                id={`upload-${component.id}`}
              />
              <label
                htmlFor={`upload-${component.id}`}
                className="cursor-pointer block"
              >
                <div className="flex flex-col items-center gap-2">
                  <Image className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    点击或拖拽文件/图层到这里
                  </span>
                  <span className="text-xs text-gray-500">
                    支持图片、音频与视频，或从图层面板拖拽图层
                  </span>
                </div>
              </label>
            </div>
            
            {/* 图层选择下拉（构建器中显示提示，实际功能在运行时） */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">或选择图层</label>
              <select
                className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled
              >
                <option value="">-- 运行时可用 --</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">图层选择功能在应用运行时可用</p>
            </div>
          </div>
        );
      }
      
      case 'dropdown':
      case 'dropdown_text':
      case 'dropdown_number':
      case 'model_select':
      case 'lora_select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">请选择...</option>
              {properties.options?.map((option, index) => (
                <option key={index} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        );
      
      case 'batch_size':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input
              type="number"
              min="1"
              max="10"
              defaultValue="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        );
      
      case 'upload_multi_media':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <p className="text-sm text-gray-600">支持图片、音频等多种格式</p>
                <p className="text-xs text-gray-500">点击或拖拽上传</p>
              </div>
            </div>
          </div>
        );
      
      case 'image_select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">选择图片源</span>
                <button className="text-sm text-blue-600 hover:text-blue-800">浏览</button>
              </div>
            </div>
          </div>
        );
      
      case 'multi_image_single':
      case 'multi_image_multi':
      case 'multi_image_multi2':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <div className="flex flex-col items-center space-y-2">
                <Image className="w-6 h-6 text-gray-400" />
                <p className="text-sm text-gray-600">多图上传区域</p>
                <p className="text-xs text-gray-500">支持批量上传</p>
              </div>
            </div>
          </div>
        );
      
      case 'mask_edit':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎭</span>
                </div>
                <p className="text-sm">遮罩编辑工具</p>
              </div>
            </div>
          </div>
        );
      
      case 'multi_image_bg':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🖼️</span>
                </div>
                <p className="text-sm">多图背景组合</p>
                <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded mt-1">Biz</span>
              </div>
            </div>
          </div>
        );
      
      case 'image_merge':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🔗</span>
                </div>
                <p className="text-sm">图片合并工具</p>
              </div>
            </div>
          </div>
        );
      
      case 'first_last_frame':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎬</span>
                </div>
                <p className="text-sm">首尾帧选择</p>
              </div>
            </div>
          </div>
        );
      
      case 'four_view':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📐</span>
                </div>
                <p className="text-sm">四视图显示</p>
              </div>
            </div>
          </div>
        );
      
      case 'color_picker':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 border border-gray-300 rounded bg-blue-500"></div>
              <input
                type="text"
                value="#3B82F6"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                readOnly
              />
            </div>
          </div>
        );
      
      case 'tag_group_single':
      case 'tag_group_multi':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="border border-gray-300 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">标签1</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">标签2</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">标签3</span>
              </div>
            </div>
          </div>
        );
      
      case 'large_model_select':
      case 'capability_model_select':
        return (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="">选择模型...</option>
              <option value="model1">GPT-4</option>
              <option value="model2">Claude-3</option>
              <option value="model3">Gemini Pro</option>
            </select>
          </div>
        );
      
      default:
        return (
          <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
            <div className="text-sm text-gray-500">未知组件类型: {type}</div>
          </div>
        );
    }
  };

  return (
    <div className="relative group">
      {/* 拖拽手柄 */}
      <div 
        className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-move text-gray-400 hover:text-gray-600"
        draggable="true"
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', component.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <div className="ml-6">
        {renderComponent()}
      </div>
      
      {/* 参数绑定指示器 */}
      {binding && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 py-0.5 rounded-full">
          ✓
        </div>
      )}
      
      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(component.id);
        }}
        className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  );
};

// 组件库
const ComponentLibrary = ({ onAddComponent }) => {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    prompt: true,
    selection: true,
    image: true,
    color: true
  });

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleDragStart = (e, componentType) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: componentType.type,
      label: componentType.label
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-medium text-gray-900">组件库</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {Object.entries(COMPONENT_TYPES).map(([key, section]) => (
          <div key={key} className="border-b border-gray-100">
            <button
              onClick={() => toggleSection(key)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <div className="flex items-center space-x-2">
                {section.icon}
                <span className="font-medium text-gray-900">{section.title}</span>
              </div>
              {expandedSections[key] ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
              }
            </button>
            
            {expandedSections[key] && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  {section.components.map((comp) => (
                    <div
                      key={comp.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, comp)}
                      className="p-3 border border-gray-200 rounded-md bg-white hover:bg-gray-50 cursor-move text-center group"
                      title={comp.description}
                    >
                      <div className="text-2xl mb-1">{comp.icon}</div>
                      <div className="text-xs text-gray-600 mb-1">{comp.label}</div>
                      {comp.badge && (
                        <span className="inline-block px-1 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          {comp.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <button className="w-full mt-2 p-2 border-2 border-dashed border-gray-300 rounded-md text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center space-x-1">
                  <Plus className="w-4 h-4" />
                  <span>添加自定义组件</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 属性面板
const PropertiesPanel = ({ 
  selectedComponent, 
  components, 
  parameterLookup, 
  nodesTree,
  outputNodes,
  onSetOutputNodes,
  onUpdateComponent, 
  onBindParam 
}) => {
  const [activeTab, setActiveTab] = useState('properties');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  
  // 获取当前选中的组件
  const component = selectedComponent ? components.find(c => c.id === selectedComponent) : null;
  
  // 工作流切换时，清空选中的节点
  useEffect(() => {
    setSelectedNodeId('');
  }, [nodesTree]);

  // 初始化选中节点ID - 必须在组件顶层调用
  useEffect(() => {
    if (component && component.boundNodeId) {
      setSelectedNodeId(component.boundNodeId);
    } else {
      setSelectedNodeId('');
    }
  }, [component]);
  
  if (!selectedComponent) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">属性面板</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <Settings className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>选择一个组件来编辑属性</p>
          </div>
        </div>
      </div>
    );
  }

  if (!component) return null;

  // 生成节点选项（不过滤无输入的节点）
  const nodeOptions = nodesTree.map(node => ({
    value: node.id,
    label: `[${node.id}]${node.name || node.type || 'Unknown'}`,
    nodeId: node.id,
    nodeName: node.name,
    nodeType: node.type
  }));

  // 获取选中节点的参数
  const getNodeParameters = (nodeId) => {
    if (!nodeId || !parameterLookup) return [];
    
    // 确保nodeId类型一致（都转换为数字进行比较）
    const targetNodeId = Number(nodeId);
    
    return Object.entries(parameterLookup)
      .filter(([path, param]) => Number(param.nodeId) === targetNodeId)
      .map(([path, param]) => ({
        value: path,
        label: param.label || param.paramKey || path,
        type: param.type,
        description: param.description,
        defaultValue: param.default,
        isRequired: !param.default
      }));
  };

  const nodeParameters = getNodeParameters(selectedNodeId);

  const handlePropertyChange = (key, value) => {
    const nextProps = { ...(component.properties || {}), [key]: value };
    onUpdateComponent(component.id, { properties: nextProps });
  };

  const renderPropertyField = (field) => {
    const props = component.properties || {};
    if (field.type === 'number') {
      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <input
            type="number"
            value={props[field.key] ?? field.defaultValue ?? ''}
            onChange={(e) => handlePropertyChange(field.key, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      );
    }
    if (field.type === 'options') {
      const options = Array.isArray(props[field.key]) ? props[field.key] : [];
      const updateOption = (index, key, val) => {
        const nextOptions = [...options];
        nextOptions[index] = { ...nextOptions[index], [key]: val };
        handlePropertyChange(field.key, nextOptions);
      };
      const addOption = () => {
        const defaultValue = field.valueType === 'number' ? 0 : '';
        handlePropertyChange(field.key, [
          ...options,
          { label: `选项${options.length + 1}`, value: defaultValue }
        ]);
      };
      const removeOption = (index) => {
        const nextOptions = options.filter((_, idx) => idx !== index);
        handlePropertyChange(field.key, nextOptions);
      };
      return (
        <div key={field.key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
          </label>
          {options.length === 0 && (
            <p className="text-xs text-gray-400">暂无选项，请点击下方按钮添加</p>
          )}
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={`${field.key}-${idx}`} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label ?? ''}
                  onChange={(e) => updateOption(idx, 'label', e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="显示文本"
                />
                <input
                  type={field.valueType === 'number' ? 'number' : 'text'}
                  value={opt.value ?? (field.valueType === 'number' ? 0 : '')}
                  onChange={(e) => {
                    const val =
                      field.valueType === 'number'
                        ? (e.target.value === '' ? '' : Number(e.target.value))
                        : e.target.value;
                    updateOption(idx, 'value', val);
                  }}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-sm"
                  placeholder="提交值"
                />
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            添加选项
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-medium text-gray-900">属性面板</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* 标签页 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-4">
            {[
              { key: 'properties', label: '属性配置' },
              { key: 'mcp', label: 'MCP属性' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-4 space-y-4">
          {/* 输出节点选择：释放给用户自行选择 */}
          {Array.isArray(outputNodes) && outputNodes.length > 0 && (
            <div className="border border-gray-200 rounded-md p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">选择输出节点（可多选）</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {outputNodes.map((out, idx) => {
                  const key = `${out.id}_${out.outputName || out.type || 'output'}`;
                  const checked = false; // 由外部 store 管理，简化为点击即回调
                  return (
                    <label key={key} className="flex items-center text-sm text-gray-700">
                      <input
                        type="checkbox"
                        className="mr-2"
                        onChange={(e) => {
                          if (typeof onSetOutputNodes === 'function') {
                            onSetOutputNodes(out, e.target.checked);
                          }
                        }}
                      />
                      <span>#{out.id} {out.name || out.outputName || out.type}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'properties' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  参数名称
                  <span className="ml-1 text-gray-400">?</span>
                </label>
                <input
                  type="text"
                  value={component.paramName || ''}
                  onChange={(e) => onUpdateComponent(component.id, { paramName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="image_path"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">选择节点</label>
                <select 
                  value={selectedNodeId}
                  onChange={(e) => {
                    setSelectedNodeId(e.target.value);
                    const selectedNode = nodeOptions.find(opt => opt.value === e.target.value);
                    onUpdateComponent(component.id, { 
                      boundNodeId: e.target.value,
                      boundNodeName: selectedNode?.nodeName,
                      boundNodeType: selectedNode?.nodeType
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">请选择节点...</option>
                  {nodeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {selectedNodeId && (
                  <div className="mt-1 text-xs text-gray-500">
                    已选择: {nodeOptions.find(opt => opt.value === selectedNodeId)?.nodeName}
                  </div>
                )}
              </div>

              {/* 节点参数选择 */}
              {selectedNodeId && nodeParameters.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择参数</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                    {nodeParameters.map(param => (
                      <div 
                        key={param.value}
                        className={`p-2 rounded cursor-pointer transition-colors ${
                          component.boundParamPath === param.value 
                            ? 'bg-blue-100 border border-blue-300' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          onUpdateComponent(component.id, { 
                            boundParamPath: param.value,
                            boundParamType: param.type,
                            boundParamLabel: param.label
                          });
                          // 同时绑定到工作流参数
                          onBindParam(component.id, param.value);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{param.label}</div>
                            <div className="text-xs text-gray-500">
                              {param.type} {param.isRequired && <span className="text-red-500">*</span>}
                            </div>
                          </div>
                          {component.boundParamPath === param.value && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        {param.description && (
                          <div className="text-xs text-gray-400 mt-1">{param.description}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {component.boundParamPath && (
                    <div className="mt-2 text-xs text-green-600">
                      ✓ 已绑定参数: {component.boundParamLabel}
                    </div>
                  )}
                </div>
              )}

              {selectedNodeId && nodeParameters.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <div className="text-sm">该节点没有可配置的参数</div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">默认值</label>
                <input
                  type="text"
                  value={component.defaultValue || ''}
                  onChange={(e) => onUpdateComponent(component.id, { defaultValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">组件标签</label>
                <input
                  type="text"
                  value={component.label}
                  onChange={(e) => onUpdateComponent(component.id, { label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={component.description || ''}
                  onChange={(e) => onUpdateComponent(component.id, { description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {Array.isArray(COMPONENT_PROPERTY_CONFIG[component.type]) &&
                COMPONENT_PROPERTY_CONFIG[component.type].length > 0 && (
                  <div className="border border-gray-200 rounded-md p-3 space-y-3">
                    <div className="text-sm font-medium text-gray-700">扩展属性</div>
                    {COMPONENT_PROPERTY_CONFIG[component.type].map(renderPropertyField)}
                  </div>
                )}
            </div>
          )}
          
          {activeTab === 'mcp' && (
            <div className="text-center text-gray-500 py-8">
              <p>MCP属性配置</p>
              <p className="text-sm">即将推出</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VisualCanvasBuilder = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [selectedParams, setSelectedParams] = useState(new Set());

  const {
    workflowId,
    parameterLookup,
    nodesTree,
    loading: workflowLoading,
    outputNodes,
  } = useWorkflowStore();

  const {
    appId,
    appData,
    components,
    uiBindings,
    paramsSchema,
    addComponent,
    updateComponent,
    removeComponent,
    bindComponentToWorkflowParam,
    setComponents,
    setUiBindings,
    setParamsSchema,
  } = useAppBuilderStore();
  
  // 本地 clearSelection 函数
  const clearSelection = () => {
    setSelectedComponent(null);
  };

  // 从appData加载已保存的components和uiBindings
  useEffect(() => {
    console.log('VisualCanvasBuilder useEffect triggered, appData:', appData);
    console.log('Current components from store:', components);
    console.log('Current uiBindings from store:', uiBindings);
    
    if (appData) {
      // 只有当store中的components为空时才从appData加载
      if (components.length === 0 && appData.components && appData.components.length > 0) {
        console.log('Loading saved components from appData:', appData.components);
        setComponents(appData.components);
      }
      
      // 只有当store中的uiBindings为空时才从appData加载
      if (uiBindings.length === 0 && appData.uiBindings && appData.uiBindings.length > 0) {
        console.log('Loading saved uiBindings from appData:', appData.uiBindings);
        setUiBindings(appData.uiBindings);
      }
    }
  }, [appData, setComponents, setUiBindings]);

  // 处理拖拽到画布
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    
    // 检查是否是从组件库拖拽的新组件
    const componentData = e.dataTransfer.getData('application/json');
    if (componentData) {
      try {
        const data = JSON.parse(componentData);
        
        const newComponent = {
          id: `comp_${Date.now()}_${Math.random()}`,
          type: data.type,
          label: data.label,
          properties: getDefaultProperties(data.type),
          order: components.length, // 添加到末尾
        };
        
        addComponent(newComponent);
        return;
      } catch (error) {
        console.error('Failed to parse drop data:', error);
        return;
      }
    }
    
    // 检查是否是组件重新排序
    const draggedComponentId = e.dataTransfer.getData('text/plain');
    const dropTarget = e.target.closest('[data-component-id]');
    
    if (draggedComponentId && dropTarget) {
      const targetComponentId = dropTarget.getAttribute('data-component-id');
      if (draggedComponentId !== targetComponentId) {
        // 重新排序组件
        const draggedIndex = sortedComponents.findIndex(c => c.id === draggedComponentId);
        const targetIndex = sortedComponents.findIndex(c => c.id === targetComponentId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          const newComponents = [...sortedComponents];
          const [draggedComponent] = newComponents.splice(draggedIndex, 1);
          newComponents.splice(targetIndex, 0, draggedComponent);
          
          // 更新order属性
          const updatedComponents = newComponents.map((comp, index) => ({
            ...comp,
            order: index
          }));
          
          setComponents(updatedComponents);
        }
      }
    }
  };

  // 处理画布拖拽悬停
  const handleCanvasDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // 获取组件默认属性
  const getDefaultProperties = (type) => {
    const defaults = {
      width: { min: 64, max: 2048, step: 64, placeholder: '宽度' },
      height: { min: 64, max: 2048, step: 64, placeholder: '高度' },
      seed: { min: 0, max: 999999999, step: 1, placeholder: '随机种子' },
      slider: { min: 0, max: 100, step: 1 },
      number: { min: 0, max: 1000, step: 1, placeholder: '请输入数值' },
      text: { placeholder: '请输入文本', maxLength: 100 },
      positive_prompt: { placeholder: '请输入正向提示词' },
      negative_prompt: { placeholder: '请输入负向提示词' },
      upload_image: { maxSize: '10MB', acceptedTypes: 'image/*' },
      model_select: { options: [{ value: 'model1', label: '模型1' }] },
      lora_select: { options: [{ value: 'lora1', label: 'Lora1' }] },
      dropdown: { options: [{ value: 'option1', label: '选项1' }] },
      dropdown_text: { options: [{ value: 'option1', label: '选项1' }] },
      dropdown_number: { options: [{ value: 0, label: '选项1' }] },
      batch_size: { min: 1, max: 10, step: 1 },
    };
    return defaults[type] || {};
  };

  // 按order排序组件
  const sortedComponents = [...components].sort((a, b) => (a.order || 0) - (b.order || 0));

  // 保存应用
  const handleSaveApp = async () => {
    try {
      // 直接从store获取最新状态，避免异步更新问题
      const currentState = useAppBuilderStore.getState();
      const latestComponents = currentState.components;
      const latestUiBindings = currentState.uiBindings;
      const latestParamsSchema = currentState.paramsSchema;
      
      console.log('Current components before save:', latestComponents);
      console.log('Current uiBindings before save:', latestUiBindings);
      console.log('Current paramsSchema before save:', latestParamsSchema);
      
      const appData = {
        components: latestComponents,
        uiBindings: latestUiBindings,
        paramsSchema: latestParamsSchema,
      };
      
      console.log('Saving app data:', appData);
      await api.patch(`/apps/${appId}`, appData);
      console.log('App saved successfully');

      // 立即重新拉取应用数据进行校验
      const response = await api.get(`/apps/${appId}`);
      const verifiedAppData = response.data?.data;
      console.log('Verified app after save:', verifiedAppData);
      console.log('Verified components length:', verifiedAppData?.components?.length);
      console.log('Verified components:', verifiedAppData?.components);

      if (verifiedAppData && Array.isArray(verifiedAppData.components) && verifiedAppData.components.length > 0) {
        alert('应用保存成功！');
        if (onNext) onNext(); // 调用onNext切换到下一步
      } else {
        console.error('验证失败 - components:', verifiedAppData?.components);
        alert('保存后未检测到组件，请重试或检查后端日志！');
      }
    } catch (error) {
      console.error('Failed to save app:', error);
      alert('保存应用失败！');
    }
  };

  // 自动根据参数生成组件并绑定
  const handleAutoMapParams = () => {
    if (!parameterLookup) return;
    const created = [];
    Object.entries(parameterLookup).forEach(([path, param]) => {
      let compType = null;
      if (param.type === 'image' || param.type === 'image_path') compType = 'upload_image';
      else if (param.type === 'number' || param.type === 'steps' || param.type === 'cfg' || param.type === 'scale_factor') compType = 'slider';
      else if (param.type === 'text' || param.type === 'string') compType = 'text';
      else if (param.type === 'model' || param.type === 'vae') compType = 'model_select';
      if (!compType) return;
      const newComponent = {
        id: `comp_${Date.now()}_${Math.random()}`,
        type: compType,
        label: param.label || param.paramKey || path,
        properties: getDefaultProperties(compType),
        order: (components.length + created.length),
        boundParamPath: path,
        boundParamType: param.type,
      };
      created.push(newComponent);
    });
    if (created.length > 0) {
      setComponents([...
        components,
        ...created
      ]);
      // 建立绑定
      const newBindings = created.map(c => ({ componentId: c.id, bindTo: c.boundParamPath }));
      setUiBindings([...(uiBindings || []), ...newBindings]);
    }
  };

  if (!workflowId || !parameterLookup || Object.keys(parameterLookup).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <p className="text-lg mb-2">请先配置工作流</p>
          <p className="text-sm">返回到应用配置步骤，确保工作流已正确配置。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      {/* 左侧组件库 */}
      <ComponentLibrary onAddComponent={addComponent} />

      {/* 中间画布区域 */}
      <div 
        ref={canvasRef} 
        className="flex-1 bg-gray-50 p-6 relative overflow-y-auto overflow-x-hidden" 
        onClick={clearSelection}
        onDrop={handleCanvasDrop}
        onDragOver={handleCanvasDragOver}
      >
        {sortedComponents.length > 0 ? (
          <div className="space-y-4 min-h-full">
            {sortedComponents.map((comp, index) => (
              <div
                key={comp.id}
                data-component-id={comp.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedComponent(comp.id);
                }}
                className={`group ${selectedComponent === comp.id ? 'ring-2 ring-blue-500' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCanvasDrop(e);
                }}
              >
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                  <ComponentRenderer
                    component={comp}
                    isSelected={selectedComponent === comp.id}
                    onSelect={setSelectedComponent}
                    onUpdate={updateComponent}
                    onDelete={removeComponent}
                    onBindParam={bindComponentToWorkflowParam}
                    getBindingForComponent={() => uiBindings.find(b => b.componentId === comp.id)}
                    parameterLookup={parameterLookup}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg mb-2">画布为空</p>
              <p className="text-sm">从左侧组件库拖拽组件到此处开始构建</p>
            </div>
          </div>
        )}
      </div>

      {/* 右侧属性面板 */}
      <PropertiesPanel
        selectedComponent={selectedComponent}
        components={components}
        parameterLookup={parameterLookup}
        nodesTree={nodesTree}
        outputNodes={outputNodes}
        onSetOutputNodes={(node, checked) => {
          // 交给 AppBuilderStore 管理：去重选择
          const current = useAppBuilderStore.getState().outputNodes || [];
          let next = [...current];
          const exists = next.find((n) => String(n.id) === String(node.id) && n.outputName === node.outputName);
          if (checked) {
            if (!exists) next.push(node);
          } else {
            next = next.filter((n) => !(String(n.id) === String(node.id) && n.outputName === node.outputName));
          }
          useAppBuilderStore.getState().setOutputNodes(next);
        }}
        onUpdateComponent={updateComponent}
        onBindParam={bindComponentToWorkflowParam}
      />

      {/* 底部操作栏 */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button
          onClick={handleAutoMapParams}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          自动参数
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSaveApp}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-1"
        >
          <Check className="w-4 h-4" />
          <span>确认</span>
        </button>
      </div>
    </div>
  );
};

export default VisualCanvasBuilder; 