import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CustomToolbar from '@frontend/components/CustomToolbar';
import { Trash2, Plus, GripVertical, Search, Filter } from 'lucide-react';
import usePermissions from '@frontend/hooks/usePermissions';
import useTranslation from '@frontend/hooks/useTranslation';

// 组件库 - 按分类组织
const ComponentLibrary = ({ onAddComponent, workflowData }) => {
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.uploadMultipleImages'),
            paramKey: '',
            defaultValue: null,
            maxCount: 10
          }
        }
      ]
    },
    advanced: {
      name: t('pageBuilder.advancedComponents'),
      components: [
        { 
          type: 'range_slider', 
          name: t('pageBuilder.rangeSlider'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4m0 0l4 4m-4-4v18m0 0l-4-4m4 4l4-4"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.rangeSlider'),
            paramKey: '',
            defaultValue: [0, 100],
            min: 0,
            max: 100
          }
        },
        { 
          type: 'date_picker', 
          name: t('pageBuilder.datePicker'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.datePicker'),
            paramKey: '',
            defaultValue: ''
          }
        },
        { 
          type: 'time_picker', 
          name: t('pageBuilder.timePicker'),
          biz: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.timePicker'),
            paramKey: '',
            defaultValue: ''
          }
        }
      ]
    },
    custom: {
      name: t('pageBuilder.customComponents'),
      components: [
        { 
          type: 'custom_component', 
          name: t('pageBuilder.customComponent'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.customComponent'),
            paramKey: '',
            componentCode: ''
          }
        },
        { 
          type: 'custom_text', 
          name: t('pageBuilder.customText'),
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          defaultProps: {
            title: t('pageBuilder.customText'),
            paramKey: '',
            text: t('pageBuilder.enterDescription')
          }
        }
      ]
    }
  };

  // 获取工作流参数选项
  const getWorkflowParamOptions = () => {
    if (!workflowData || !workflowData.parameters) return [];
    
    return Object.keys(workflowData.parameters).map(key => {
      const param = workflowData.parameters[key];
      return {
        value: key,
        label: param.title || key,
        description: param.description || `${param.nodeType} - ${param.port}`,
        nodeId: param.nodeId,
        port: param.port,
        type: param.type
      };
    });
  };

  // 过滤组件
  const filteredComponents = componentCategories[activeCategory]?.components.filter(component => {
    // 检查权限：如果是商业版功能，需要是商业版用户才能使用
    if (component.biz && !isBizUser) {
      return false;
    }
    
    // 检查组件访问权限
    if (canAccessComponent && typeof canAccessComponent === 'function') {
      return canAccessComponent(component.type);
    }
    
    return component.name.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{t('pageBuilder.componentLibrary')}</h3>
      
      {/* 搜索框 */}
      <div className="relative mb-3">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder={t('pageBuilder.searchComponents')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* 分类标签 */}
      <div className="flex overflow-x-auto mb-3 pb-1">
        {Object.entries(componentCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => {
              setActiveCategory(key);
              setSearchTerm('');
            }}
            className={`flex-shrink-0 px-3 py-1 text-xs rounded-full mr-2 ${
              activeCategory === key
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            {category.name}
            {category.components.some(c => c.biz) && (
              <span className="ml-1 text-red-500 text-xs">Biz</span>
            )}
          </button>
        ))}
      </div>
      
      {/* 组件列表 */}
      <div className="grid grid-cols-1 gap-2 flex-grow overflow-y-auto">
        {filteredComponents.map((component, index) => (
          <button
            key={index}
            onClick={() => {
              // 添加工作流参数选项到组件
              const componentWithParams = {
                ...component,
                workflowParamOptions: getWorkflowParamOptions()
              };
              onAddComponent(componentWithParams);
            }}
            className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors relative"
            draggable
            onDragStart={(e) => {
              // 只序列化需要的属性，避免循环引用
              const componentData = {
                type: component.type,
                name: component.name,
                defaultProps: component.defaultProps
              };
              e.dataTransfer.setData('component', JSON.stringify(componentData));
            }}
          >
            <div className="text-gray-600 mr-2">
              {component.icon}
            </div>
            <span className="text-sm text-gray-700">{component.name}</span>
            {component.biz && (
              <span className="absolute top-1 right-1 text-red-500 text-xs">Biz</span>
            )}
          </button>
        ))}
                  
        {/* 显示权限升级提示 */}
        {userRole !== 'enterprise' && activeCategory === 'advanced' && (
          <div className="text-center py-4 text-gray-500 text-sm border-t border-gray-200 mt-2">
            <p>高级组件需要企业版权限</p>
            <button 
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              onClick={() => alert('请联系管理员升级到企业版')}
            >
              了解更多
            </button>
          </div>
        )}
        
        {filteredComponents.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            未找到匹配的组件
          </div>
        )}
      </div>
      
      {/* 显示可用的工作流参数 */}
      {workflowData && workflowData.parameters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-xs font-medium text-gray-700 mb-2">{t('pageBuilder.availableParams')}</h4>
          <div className="max-h-40 overflow-y-auto">
            {Object.keys(workflowData.parameters).slice(0, 10).map(key => {
              const param = workflowData.parameters[key];
              return (
                <div key={key} className="text-xs text-gray-600 py-1 px-2 bg-gray-50 rounded mb-1">
                  <div className="font-medium">{param.title || key}</div>
                  <div className="text-gray-500">{param.description || `${param.nodeType} - ${param.port}`}</div>
                </div>
              );
            })}
            {Object.keys(workflowData.parameters).length > 10 && (
              <div className="text-xs text-gray-500 text-center py-1">
                还有 {Object.keys(workflowData.parameters).length - 10} 个参数...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 页面构建和预览组件
const PageBuilderAndPreview = ({ components, selectedComponent, onSelectComponent, workflowData, workflowParams, onAddParameterMapping, onRemoveParameterMapping }) => {
  const { t } = useTranslation();
  const [previewMode, setPreviewMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const previewPage = async () => {
    try {
      // 这里应该调用预览页面的API
      // 暂时返回模拟数据
      setPreviewUrl('https://placehold.co/800x600?text=页面预览');
      setPreviewMode(true);
    } catch (error) {
      console.error('预览页面失败:', error);
    }
  };

  const exitPreview = () => {
    setPreviewMode(false);
    setPreviewUrl('');
  };

  if (previewMode) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">{t('pageBuilder.preview')}</h3>
          <button
            onClick={exitPreview}
            className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common.exitPreview')}
          </button>
        </div>
        
        <div className="flex-1 bg-gray-50 rounded-md overflow-hidden">
          {previewUrl ? (
            <img 
              src={previewUrl} 
              alt="页面预览" 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              页面预览加载中...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">{t('pageBuilder.buildArea')}</h3>
        <div className="flex gap-2">
          <div className="text-xs text-gray-500">
            {components.length} {t('pageBuilder.componentsCount')}
          </div>
          <button
            onClick={previewPage}
            className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {t('common.preview')}
          </button>
        </div>
      </div>
      
      <div 
        className="flex-1 min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 overflow-y-auto"
        onDragOver={(e) => e.preventDefault()}
      >
        {components.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <GripVertical className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p>{t('pageBuilder.dragHint')}</p>
              <p className="text-xs mt-1">{t('pageBuilder.clickHint')}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {components.map(component => (
              <div 
                key={component.id}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${
                  selectedComponent?.id === component.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onSelectComponent(component)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{component.title}</div>
                    <div className="text-sm text-gray-500">{component.type}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {component.paramKey}
                  </div>
                </div>
                {component.defaultValue !== undefined && (
                  <div className="mt-2 text-sm text-gray-600">
                    {t('pageBuilder.defaultValue')}: {String(component.defaultValue)}
                  </div>
                )}
                {component.binding?.paramKey && (
                  <div className="mt-1 text-xs text-blue-600">
                    {t('pageBuilder.bindWorkflowParam')}: {workflowData?.parameters?.[component.binding.paramKey]?.title || component.binding.paramKey}
                  </div>
                )}
                {component.biz && (
                  <div className="mt-1 text-xs text-red-600">
                    商业版功能
                  </div>
                )}
                
                {/* 参数映射 */}
                {component.parameterMappings && component.parameterMappings.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-700 mb-1">参数映射:</div>
                    <div className="flex flex-wrap gap-1">
                      {component.parameterMappings.map(mapping => (
                        <span key={mapping.paramKey} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {mapping.title}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveParameterMapping(component.id, mapping.paramKey);
                            }}
                            className="flex-shrink-0 ml-1 h-4 w-4 text-blue-600 hover:text-blue-800"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 显示工作流信息 */}
      {workflowData && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <div className="text-xs text-blue-800 font-medium">
            当前工作流: {workflowData.name || workflowData.workflowId}
          </div>
          {workflowParams && Object.keys(workflowParams).length > 0 && (
            <div className="text-xs text-blue-700 mt-1">
              已配置 {Object.keys(workflowParams).length} 个参数
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 属性面板组件
const PropertyPanel = ({ selectedComponent, onChange, onDelete, workflowData, onAddParameterMapping, onRemoveParameterMapping }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('basic'); // 添加Tab状态
  const [localComponent, setLocalComponent] = useState(selectedComponent);

  useEffect(() => {
    setLocalComponent(selectedComponent);
  }, [selectedComponent]);

  const handleChange = (field, value) => {
    // 确保selectedComponent存在
    if (!selectedComponent) return;
    
    const updatedComponent = { ...localComponent, [field]: value };
    setLocalComponent(updatedComponent);
    onChange?.(updatedComponent);
  };

  const handlePropsChange = (field, value) => {
    // 确保selectedComponent存在
    if (!selectedComponent) return;
    
    const updatedComponent = { 
      ...localComponent, 
      props: { ...localComponent.props, [field]: value } 
    };
    setLocalComponent(updatedComponent);
    onChange?.(updatedComponent);
  };

  // 获取工作流参数选项
  const getWorkflowParamOptions = () => {
    if (!workflowData || !workflowData.parameters) return [];
    
    return Object.keys(workflowData.parameters).map(key => {
      const param = workflowData.parameters[key];
      return {
        value: key,
        label: param.title || key,
        description: param.description || `${param.nodeType} - ${param.port}`,
        nodeId: param.nodeId,
        port: param.port,
        type: param.type
      };
    });
  };

  // 如果没有选中组件，显示提示信息
  if (!selectedComponent) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{t('pageBuilder.propertyPanel')}</h3>
        <p className="text-sm text-gray-500">
          {t('pageBuilder.selectComponentHint')}
        </p>
      </div>
    );
  }

  // 确保localComponent存在且有title属性
  if (!localComponent || !localComponent.hasOwnProperty('title')) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 h-full">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{t('pageBuilder.propertyPanel')}</h3>
        <p className="text-sm text-gray-500">
          {t('pageBuilder.selectComponentHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 h-full overflow-y-auto">
      {/* Tab导航 */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('pageBuilder.basicProperties')}
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'mcp'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('pageBuilder.mcpProperties')}
          </button>
          <button
            onClick={() => setActiveTab('parameters')}
            className={`py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === 'parameters'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            参数映射
          </button>
        </nav>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-700">{t('pageBuilder.propertyPanel')}</h3>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      {activeTab === 'basic' && (
        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pageBuilder.title')}
            </label>
            <input
              type="text"
              value={localComponent.title || ''}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 参数名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pageBuilder.paramKey')}
            </label>
            <input
              type="text"
              value={localComponent.paramKey || ''}
              onChange={(e) => handleChange('paramKey', e.target.value)}
              placeholder="表单字段名，如 image_path"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 绑定工作流参数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pageBuilder.bindWorkflowParam')}
            </label>
            <select
              value={localComponent.binding?.paramKey || ''}
              onChange={(e) => {
                const paramKey = e.target.value;
                if (paramKey) {
                  const param = workflowData.parameters[paramKey];
                  const binding = { 
                    paramKey,
                    nodeId: param.nodeId,
                    port: param.port,
                    type: param.type
                  };
                  handleChange('binding', binding);
                } else {
                  handleChange('binding', undefined);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">不绑定</option>
              {getWorkflowParamOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} ({option.nodeId}.{option.port})
                </option>
              ))}
            </select>
            {localComponent.binding?.paramKey && workflowData?.parameters?.[localComponent.binding.paramKey] && (
              <div className="mt-2 text-xs text-gray-500">
                {workflowData.parameters[localComponent.binding.paramKey].description}
              </div>
            )}
          </div>

          {/* 根据组件类型显示特定属性 */}
          {selectedComponent.type === 'upload_image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pageBuilder.defaultValue')}
              </label>
              <input
                type="text"
                value={localComponent.defaultValue || ''}
                onChange={(e) => handleChange('defaultValue', e.target.value)}
                placeholder="默认图片URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {selectedComponent.type === 'text_input' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pageBuilder.defaultValue')}
              </label>
              <input
                type="text"
                value={localComponent.defaultValue || ''}
                onChange={(e) => handleChange('defaultValue', e.target.value)}
                placeholder="默认文本"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {selectedComponent.type === 'select' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.defaultValue')}
                </label>
                <input
                  type="text"
                  value={localComponent.defaultValue || ''}
                  onChange={(e) => handleChange('defaultValue', e.target.value)}
                  placeholder="默认选项值"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.options')}
                </label>
                <textarea
                  value={localComponent.props?.options?.join('\n') || ''}
                  onChange={(e) => handlePropsChange('options', e.target.value.split('\n').filter(o => o.trim()))}
                  placeholder="选项1&#10;选项2&#10;选项3"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {selectedComponent.type === 'slider' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.defaultValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.defaultValue || 0}
                  onChange={(e) => handleChange('defaultValue', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.minValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.props?.min || 0}
                  onChange={(e) => handlePropsChange('min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.maxValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.props?.max || 100}
                  onChange={(e) => handlePropsChange('max', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {selectedComponent.type === 'textarea' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pageBuilder.defaultValue')}
              </label>
              <textarea
                value={localComponent.defaultValue || ''}
                onChange={(e) => handleChange('defaultValue', e.target.value)}
                placeholder="默认文本"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {selectedComponent.type === 'checkbox' && (
            <div className="flex items-center">
              <input
                id="default-checkbox"
                type="checkbox"
                checked={localComponent.defaultValue || false}
                onChange={(e) => handleChange('defaultValue', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="default-checkbox" className="ml-2 block text-sm text-gray-700">
                默认选中
              </label>
            </div>
          )}

          {selectedComponent.type === 'upload_multiple_images' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pageBuilder.maxUploadCount')}
              </label>
              <input
                type="number"
                value={localComponent.props?.maxCount || 10}
                onChange={(e) => handlePropsChange('maxCount', parseInt(e.target.value) || 10)}
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {selectedComponent.type === 'number_input' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.defaultValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.defaultValue || 0}
                  onChange={(e) => handleChange('defaultValue', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.minValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.props?.min || 0}
                  onChange={(e) => handlePropsChange('min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.maxValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.props?.max || 100}
                  onChange={(e) => handlePropsChange('max', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}
          
          {selectedComponent.type === 'color_picker' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pageBuilder.defaultValue')}
              </label>
              <input
                type="color"
                value={localComponent.defaultValue || '#000000'}
                onChange={(e) => handleChange('defaultValue', e.target.value)}
                className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
          
          {selectedComponent.type === 'range_slider' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.defaultValue')}
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={localComponent.defaultValue?.[0] || 0}
                    onChange={(e) => handleChange('defaultValue', [parseInt(e.target.value) || 0, localComponent.defaultValue?.[1] || 100])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <input
                    type="number"
                    value={localComponent.defaultValue?.[1] || 100}
                    onChange={(e) => handleChange('defaultValue', [localComponent.defaultValue?.[0] || 0, parseInt(e.target.value) || 100])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.minValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.props?.min || 0}
                  onChange={(e) => handlePropsChange('min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('pageBuilder.maxValue')}
                </label>
                <input
                  type="number"
                  value={localComponent.props?.max || 100}
                  onChange={(e) => handlePropsChange('max', parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {selectedComponent.type === 'custom_text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('pageBuilder.descriptionText')}
              </label>
              <textarea
                value={localComponent.props?.text || ''}
                onChange={(e) => handlePropsChange('text', e.target.value)}
                placeholder={t('pageBuilder.enterDescription')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'mcp' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h4 className="text-xs font-medium text-yellow-800 mb-2">{t('pageBuilder.mcpProperties')}</h4>
            <p className="text-xs text-yellow-700">
              MCP (Model-Component-Parameter) 属性用于定义组件与模型参数的映射关系。
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pageBuilder.paramType')}
            </label>
            <select
              value={localComponent.mcpType || 'string'}
              onChange={(e) => handleChange('mcpType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="string">字符串</option>
              <option value="number">数字</option>
              <option value="boolean">布尔值</option>
              <option value="image">图像</option>
              <option value="array">数组</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pageBuilder.validationRules')}
            </label>
            <textarea
              value={localComponent.validationRules || ''}
              onChange={(e) => handleChange('validationRules', e.target.value)}
              placeholder="JSON格式的验证规则"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('pageBuilder.rateLimit')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('pageBuilder.requests')}</label>
                <input
                  type="number"
                  value={localComponent.rateLimit?.requests || 100}
                  onChange={(e) => handleChange('rateLimit', { 
                    ...localComponent.rateLimit, 
                    requests: parseInt(e.target.value) || 100 
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('pageBuilder.timeWindow')}</label>
                <input
                  type="number"
                  value={localComponent.rateLimit?.window || 3600}
                  onChange={(e) => handleChange('rateLimit', { 
                    ...localComponent.rateLimit, 
                    window: parseInt(e.target.value) || 3600 
                  })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'parameters' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-xs font-medium text-blue-800 mb-2">参数映射配置</h4>
            <p className="text-xs text-blue-700">
              为组件配置参数映射，使其能够与工作流中的参数进行关联。
            </p>
          </div>
          
          {/* 参数映射列表 */}
          {localComponent.parameterMappings && localComponent.parameterMappings.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700">已配置的映射</h5>
              {localComponent.parameterMappings.map((mapping, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                  <div>
                    <div className="text-sm font-medium">{mapping.title}</div>
                    <div className="text-xs text-gray-500">{mapping.paramKey}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newMappings = [...localComponent.parameterMappings];
                      newMappings.splice(index, 1);
                      handleChange('parameterMappings', newMappings);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* 添加参数映射 */}
          <div className="pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">添加参数映射</h5>
            <div className="space-y-2">
              <select
                onChange={(e) => {
                  const paramKey = e.target.value;
                  if (paramKey) {
                    const workflowParam = workflowData.parameters[paramKey];
                    const newMapping = {
                      paramKey,
                      title: workflowParam.title || paramKey,
                      nodeId: workflowParam.nodeId,
                      port: workflowParam.port,
                      type: workflowParam.type
                    };
                    
                    // 添加到parameterMappings数组
                    const currentMappings = localComponent.parameterMappings || [];
                    const newMappings = [...currentMappings, newMapping];
                    handleChange('parameterMappings', newMappings);
                    
                    // 清空选择
                    e.target.value = '';
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">选择工作流参数</option>
                {getWorkflowParamOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.nodeId}.{option.port})
                  </option>
                ))}
              </select>
              
              {getWorkflowParamOptions().length === 0 && workflowData && (
                <div className="text-xs text-gray-500">
                  当前工作流暂无可用参数
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 主要的PageBuilder组件
const PageBuilder = ({ appId, onNext, onBack, initialData }) => {
  const { t } = useTranslation();
  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [workflowData, setWorkflowData] = useState(null);
  const [workflowParams, setWorkflowParams] = useState({});
  const [loading, setLoading] = useState(false);

  // 初始化组件数据
  useEffect(() => {
    if (initialData) {
      setComponents(initialData.components || []);
      setWorkflowData(initialData.workflowData || null);
      setWorkflowParams(initialData.workflowParams || {});
    }
  }, [initialData]);

  // 添加组件
  const addComponent = (componentTemplate) => {
    const newComponent = {
      id: Date.now().toString(),
      ...componentTemplate,
      title: componentTemplate.name,
      paramKey: '',
      defaultValue: componentTemplate.defaultProps?.defaultValue || '',
      props: componentTemplate.defaultProps || {}
    };
    
    setComponents(prev => [...prev, newComponent]);
  };

  // 更新组件
  const updateComponent = (updatedComponent) => {
    setComponents(prev => 
      prev.map(comp => comp.id === updatedComponent.id ? updatedComponent : comp)
    );
    
    // 如果更新的是选中的组件，也要更新选中组件的状态
    if (selectedComponent && selectedComponent.id === updatedComponent.id) {
      setSelectedComponent(updatedComponent);
    }
  };

  // 删除组件
  const deleteComponent = (componentId) => {
    setComponents(prev => prev.filter(comp => comp.id !== componentId));
    setSelectedComponent(null);
  };

  // 处理拖拽放置
  const handleDrop = (e) => {
    e.preventDefault();
    const componentData = e.dataTransfer.getData('component');
    
    if (componentData) {
      try {
        const componentTemplate = JSON.parse(componentData);
        addComponent(componentTemplate);
      } catch (error) {
        console.error('解析拖拽数据失败:', error);
      }
    }
  };

  // 添加参数映射
  const addParameterMapping = (componentId, mapping) => {
    setComponents(prev => 
      prev.map(comp => {
        if (comp.id === componentId) {
          const currentMappings = comp.parameterMappings || [];
          // 检查是否已存在相同的映射
          const exists = currentMappings.some(m => m.paramKey === mapping.paramKey);
          if (!exists) {
            return {
              ...comp,
              parameterMappings: [...currentMappings, mapping]
            };
          }
        }
        return comp;
      })
    );
    
    // 如果更新的是选中的组件，也要更新选中组件的状态
    if (selectedComponent && selectedComponent.id === componentId) {
      const currentMappings = selectedComponent.parameterMappings || [];
      const exists = currentMappings.some(m => m.paramKey === mapping.paramKey);
      if (!exists) {
        setSelectedComponent({
          ...selectedComponent,
          parameterMappings: [...currentMappings, mapping]
        });
      }
    }
  };

  // 移除参数映射
  const removeParameterMapping = (componentId, paramKey) => {
    setComponents(prev => 
      prev.map(comp => {
        if (comp.id === componentId) {
          const currentMappings = comp.parameterMappings || [];
          return {
            ...comp,
            parameterMappings: currentMappings.filter(mapping => mapping.paramKey !== paramKey)
          };
        }
        return comp;
      })
    );
    
    // 如果更新的是选中的组件，也要更新选中组件的状态
    if (selectedComponent && selectedComponent.id === componentId) {
      const currentMappings = selectedComponent.parameterMappings || [];
      setSelectedComponent({
        ...selectedComponent,
        parameterMappings: currentMappings.filter(mapping => mapping.paramKey !== paramKey)
      });
    }
  };

  // 保存页面DSL
  const savePageDSL = async () => {
    if (!appId) return;
    
    setLoading(true);
    try {
      // 构建页面DSL数据
      const pageDSL = {
        appId,
        components,
        workflowData,
        workflowParams
      };

      // 调用保存页面DSL的API
      await axios.post(`/api/apps/${appId}/page`, {
        components,
        layout: 'one-column'
      });
      
      console.log('保存页面DSL:', pageDSL);
      onNext?.();
    } catch (error) {
      console.error('保存页面失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 主要内容区域 - 使用固定高度以确保滚动正常工作 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-1 min-h-0 gap-6">
          {/* 左侧组件库 - 固定宽度 */}
          <div className="w-64 flex-shrink-0">
            <ComponentLibrary onAddComponent={addComponent} workflowData={workflowData} />
          </div>
          
          {/* 中间页面构建和预览区域 - 占据剩余空间 */}
          <div className="flex-1 min-w-0">
            <div 
              className="h-full"
              onDrop={handleDrop}
            >
              <PageBuilderAndPreview 
                components={components}
                selectedComponent={selectedComponent}
                onSelectComponent={setSelectedComponent}
                workflowData={workflowData}
                workflowParams={workflowParams}
                onAddParameterMapping={addParameterMapping}
                onRemoveParameterMapping={removeParameterMapping}
              />
            </div>
          </div>
          
          {/* 右侧属性面板 - 固定宽度 */}
          <div className="w-80 flex-shrink-0">
            <PropertyPanel 
              selectedComponent={selectedComponent}
              onChange={updateComponent}
              onDelete={() => deleteComponent(selectedComponent.id)}
              workflowData={workflowData}
              onAddParameterMapping={addParameterMapping}
              onRemoveParameterMapping={removeParameterMapping}
            />
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {t('common.previous')}
        </button>
        <button
          onClick={savePageDSL}
          disabled={loading}
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            loading
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              保存中...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
              </svg>
              {t('common.save')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default PageBuilder;