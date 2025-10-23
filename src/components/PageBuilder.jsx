import React, { useState, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { Trash2, Plus, GripVertical, Search, Filter } from 'lucide-react';
import usePermissions from '@/hooks/usePermissions';
import useTranslation from "@/hooks/useTranslation";
import useAppBuilderStore from "@/store/useAppBuilderStore";
import useWorkflowStore from "@/store/useWorkflowStore";
import ParameterCascader from '@/components/ParameterCascader';
import axios from 'axios';

// 可视化组件渲染器
const ComponentRenderer = ({ component, isSelected, onSelect, onUpdate, onDelete, onBindParam, getBindingForComponent, workflowCascaderOptions }) => {
  const { t } = useTranslation();
  const [localValue, setLocalValue] = useState(component.defaultProps.defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const propertyPanelRef = useRef(null);

  useEffect(() => {
    setLocalValue(component.defaultProps.defaultValue);
  }, [component.defaultProps.defaultValue]);

  const handleValueChange = (e) => {
    setLocalValue(e.target.value);
    onUpdate(component.id, { defaultProps: { ...component.defaultProps, defaultValue: e.target.value } });
  };

  const handleBindChange = (path) => {
    onBindParam(component.id, path);
    // 自动更新组件的 name 和 type
    const [nodeName, paramKey] = path.split('.');
    const node = workflowCascaderOptions.find(n => n.value === nodeName);
    const param = node?.children.find(c => c.value === path);
    if (param) {
      onUpdate(component.id, { defaultProps: { ...component.defaultProps, title: paramKey, type: param.type } });
    }
  };

  const renderInput = () => {
    switch (component.type) {
      case 'text_input':
      case 'positive_prompt':
      case 'negative_prompt':
        return <input type="text" value={localValue} onChange={handleValueChange} className="w-full p-1 border rounded" />;
      case 'textarea':
        return <textarea value={localValue} onChange={handleValueChange} className="w-full p-1 border rounded" />;
      case 'number_input':
        return <input type="number" value={localValue} onChange={handleValueChange} className="w-full p-1 border rounded" />;
      case 'slider':
        return (
          <input 
            type="range" 
            min={component.defaultProps.min || 0}
            max={component.defaultProps.max || 100}
            value={localValue}
            onChange={handleValueChange}
            className="w-full"
          />
        );
      case 'checkbox':
        return <input type="checkbox" checked={localValue} onChange={(e) => setLocalValue(e.target.checked)} className="p-1" />;
      case 'color_picker':
        return <input type="color" value={localValue} onChange={handleValueChange} className="w-full p-1 border rounded" />;
      case 'upload_image':
      case 'upload_single_image':
        return <input type="file" className="w-full text-sm" />;
      case 'select':
      case 'model_select':
      case 'lora_select':
      case 'preset_select':
        return (
          <select value={localValue} onChange={handleValueChange} className="w-full p-1 border rounded">
            {component.defaultProps.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      default:
        return <p>未知组件类型</p>;
    }
  };

  const boundParamPath = getBindingForComponent(component.id);

  return (
    <div
      className={`relative border p-2 bg-white shadow-sm rounded ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
      onClick={() => onSelect(component)}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">{component.defaultProps.title || component.name}</h4>
        <button onClick={(e) => { e.stopPropagation(); onDelete(component.id); }} className="text-red-500 hover:text-red-700">
          <Trash2 size={16} />
        </button>
      </div>
      {renderInput()}
      {boundParamPath && (
        <p className="text-xs text-gray-500 mt-1">已绑定: {boundParamPath}</p>
      )}

      {isSelected && (
        <div ref={propertyPanelRef} className="absolute right-full top-0 w-64 bg-white border border-gray-300 rounded-md shadow-lg p-4 z-10 mr-4">
          <h5 className="text-md font-bold mb-3">组件属性</h5>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">标题</label>
              <input
                type="text"
                value={component.defaultProps.title}
                onChange={(e) => onUpdate(component.id, { defaultProps: { ...component.defaultProps, title: e.target.value } })}
                className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">绑定工作流参数</label>
              <ParameterCascader
                options={workflowCascaderOptions}
                value={boundParamPath}
                onChange={handleBindChange}
                placeholder="选择要绑定的参数"
              />
              {boundParamPath && (
                <button 
                  onClick={() => onBindParam(component.id, null)} 
                  className="mt-1 text-red-500 text-xs hover:text-red-700"
                >
                  解除绑定
                </button>
              )}
            </div>
            {/* 其他属性编辑，例如 min/max for slider */}
            {component.type === 'slider' && (
              <div className="flex space-x-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">最小值</label>
                  <input
                    type="number"
                    value={component.defaultProps.min}
                    onChange={(e) => onUpdate(component.id, { defaultProps: { ...component.defaultProps, min: Number(e.target.value) } })}
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">最大值</label>
                  <input
                    type="number"
                    value={component.defaultProps.max}
                    onChange={(e) => onUpdate(component.id, { defaultProps: { ...component.defaultProps, max: Number(e.target.value) } })}
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
              </div>
            )}
            {component.type === 'number_input' && (
              <div className="flex space-x-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">最小值</label>
                  <input
                    type="number"
                    value={component.defaultProps.min}
                    onChange={(e) => onUpdate(component.id, { defaultProps: { ...component.defaultProps, min: Number(e.target.value) } })}
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">最大值</label>
                  <input
                    type="number"
                    value={component.defaultProps.max}
                    onChange={(e) => onUpdate(component.id, { defaultProps: { ...component.defaultProps, max: Number(e.target.value) } })}
                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 组件库 - 按分类组织
const ComponentLibrary = ({ onAddComponent }) => {
  const { isBizUser, hasPermission, canAccessComponent, userRole } = usePermissions();
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('basic');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 分类的组件
  const componentCategories = {
    basic: {
      name: t('pageBuilder.basicComponents'),
      components: [
        { 
          type: 'upload_image', 
          name: t('pageBuilder.uploadImage'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.uploadImage'),
            paramKey: '',
            defaultValue: null
          }
        },
        { 
          type: 'text_input', 
          name: t('pageBuilder.textInput'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.textInput'),
            paramKey: '',
            defaultValue: ''
          }
        },
        { 
          type: 'select', 
          name: t('pageBuilder.select'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4m0 0l4 4m-4-4v18m0 0l-4-4m4 4l4-4"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.select'),
            paramKey: '',
            defaultValue: '',
            options: []
          }
        },
        { 
          type: 'slider', 
          name: t('pageBuilder.slider'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4m0 0l4 4m-4-4v18m0 0l-4-4m4 4l4-4"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.slider'),
            paramKey: '',
            defaultValue: 0,
            min: 0,
            max: 100
          }
        },
        { 
          type: 'textarea', 
          name: t('pageBuilder.textarea'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.textarea'),
            paramKey: '',
            defaultValue: ''
          }
        },
        { 
          type: 'checkbox', 
          name: t('pageBuilder.checkbox'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.checkbox'),
            paramKey: '',
            defaultValue: false
          }
        },
        { 
          type: 'number_input', 
          name: t('pageBuilder.numberInput'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.numberInput'),
            paramKey: '',
            defaultValue: 0,
            min: 0,
            max: 100
          }
        },
        { 
          type: 'color_picker', 
          name: t('pageBuilder.colorPicker'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.colorPicker'),
            paramKey: '',
            defaultValue: '#000000'
          }
        }
      ]
    },
    prompt: {
      name: t('pageBuilder.promptComponents'),
      components: [
        { 
          type: 'positive_prompt', 
          name: t('pageBuilder.positivePrompt'),
          biz: true, // 商业版功能
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2V8a2 2 0 012-2h2.5"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.positivePrompt'),
            paramKey: '',
            defaultValue: ''
          }
        },
        { 
          type: 'negative_prompt', 
          name: t('pageBuilder.negativePrompt'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m0 0v9m0-9l2 2m-2-2l-2 2M7 20h10a2 2 0 002-2V8a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.negativePrompt'),
            paramKey: '',
            defaultValue: ''
          }
        },
        { 
          type: 'prompt_template', 
          name: t('pageBuilder.promptTemplate'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.promptTemplate'),
            paramKey: '',
            defaultValue: '',
            templateId: ''
          }
        }
      ]
    },
    selection: {
      name: t('pageBuilder.selectionComponents'),
      components: [
        { 
          type: 'model_select', 
          name: t('pageBuilder.modelSelect'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.modelSelect'),
            paramKey: '',
            defaultValue: '',
            options: []
          }
        },
        { 
          type: 'lora_select', 
          name: t('pageBuilder.loraSelect'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.loraSelect'),
            paramKey: '',
            defaultValue: '',
            options: []
          }
        },
        { 
          type: 'preset_select', 
          name: t('pageBuilder.presetSelect'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.presetSelect'),
            paramKey: '',
            defaultValue: '',
            presetId: ''
          }
        }
      ]
    },
    image: {
      name: t('pageBuilder.imageComponents'),
      components: [
        { 
          type: 'upload_single_image', 
          name: t('pageBuilder.uploadSingleImage'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.uploadSingleImage'),
            paramKey: '',
            defaultValue: null
          }
        },
        { 
          type: 'upload_multiple_images', 
          name: t('pageBuilder.uploadMultipleImages'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.uploadMultipleImages'),
            paramKey: '',
            defaultValue: []
          }
        },
        { 
          type: 'image_display', 
          name: t('pageBuilder.imageDisplay'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.imageDisplay'),
            paramKey: '',
            defaultValue: null
          }
        }
      ]
    },
    layout: {
      name: t('pageBuilder.layoutComponents'),
      components: [
        { 
          type: 'container', 
          name: t('pageBuilder.container'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.container'),
            children: [],
            style: { minHeight: '50px', border: '1px dashed #ccc' }
          }
        },
        { 
          type: 'text_block', 
          name: t('pageBuilder.textBlock'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.textBlock'),
            content: '这是一个文本块',
            style: { padding: '10px' }
          }
        }
      ]
    }
  };

  const filteredComponents = Object.keys(componentCategories).reduce((acc, categoryKey) => {
    const category = componentCategories[categoryKey];
    const components = category.components.filter(comp => 
      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) && canAccessComponent(comp)
    );
    if (components.length > 0) {
      acc.push({ ...category, components });
    }
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索组件..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2 overflow-x-auto">
          {Object.keys(componentCategories).map(categoryKey => (
            <button
              key={categoryKey}
              onClick={() => setActiveCategory(categoryKey)}
              className={`px-3 py-1 rounded-full text-sm font-medium 
                ${activeCategory === categoryKey ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {componentCategories[categoryKey].name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {filteredComponents.map(category => (
          <div key={category.name}>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">{category.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              {category.components.map(comp => (
                <div
                  key={comp.type}
                  className="flex flex-col items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onAddComponent(comp)}
                >
                  {comp.icon}
                  <span className="mt-2 text-xs text-center">{comp.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PageBuilder = ({ onNext, onBack }) => {
  const { t } = useTranslation();
  const { 
    appId, 
    components, 
    uiBindings, 
    selectedComponent, 
    addComponent, 
    updateComponent, 
    removeComponent, 
    selectComponent, 
    clearSelection, 
    bindComponentToWorkflowParam,
    unbindComponentFromWorkflowParam
  } = useAppBuilderStore();
  const { workflow, cascaderData } = useWorkflowStore();

  const canvasRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (canvasRef.current && !canvasRef.current.contains(event.target)) {
        clearSelection();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clearSelection]);

  const handleSave = async () => {
    if (!appId) {
      console.error('App ID is missing. Cannot save.');
      return;
    }
    try {
      const response = await axios.patch(`/api/apps/${appId}`, {
        components: components,
        uiBindings: uiBindings,
      });
      console.log('App saved successfully:', response.data);
      onNext();
    } catch (error) {
      console.error('Failed to save app:', error);
      alert('保存应用失败！');
    }
  };

  if (!workflow) {
    return (
      <div className="text-center text-gray-500">
        <p>请先返回到应用配置步骤，确保工作流已正确配置。</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">返回</button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左侧组件库 */}
      <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
        <ComponentLibrary onAddComponent={addComponent} />
      </div>

      {/* 中间画布区域 */}
      <div ref={canvasRef} className="flex-grow bg-gray-100 p-4 relative overflow-auto" onClick={clearSelection}>
        {components.map((comp) => (
          <Rnd
            key={comp.id}
            size={{ width: comp.width, height: comp.height }}
            position={{ x: comp.x, y: comp.y }}
            onDragStop={(e, d) => {
              updateComponent(comp.id, { x: d.x, y: d.y });
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              updateComponent(comp.id, {
                width: ref.offsetWidth,
                height: ref.offsetHeight,
                x: position.x,
                y: position.y,
              });
            }}
            bounds="parent"
            minWidth={50}
            minHeight={50}
            className={`border ${selectedComponent?.id === comp.id ? 'border-blue-500' : 'border-gray-300'} bg-white shadow-md rounded`}
          >
            <ComponentRenderer 
              component={comp} 
              isSelected={selectedComponent?.id === comp.id}
              onSelect={selectComponent}
              onUpdate={updateComponent}
              onDelete={removeComponent}
              onBindParam={bindComponentToWorkflowParam}
              getBindingForComponent={(id) => uiBindings[id]}
              workflowCascaderOptions={cascaderData}
            />
          </Rnd>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex space-x-3">
        <button type="button" onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
          {t('common.previous')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
        >
          {t('pageBuilder.saveAndNext')}
        </button>
      </div>
    </div>
  );
};

export default PageBuilder;
