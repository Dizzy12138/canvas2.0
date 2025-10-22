import { useState, useEffect } from 'react';

// 语言资源
const translations = {
  zh: {
    // 应用配置相关
    'appConfig.title': '应用配置',
    'appConfig.basicTab': '基础配置',
    'appConfig.advancedTab': '高级配置',
    'appConfig.appName': '应用名称',
    'appConfig.timeout': '超时时间(秒)',
    'appConfig.outputNodes': '产出节点配置',
    'appConfig.addNode': '添加产出节点',
    'appConfig.nodeId': '选择产出节点',
    'appConfig.port': '选择端口',
    'appConfig.outputType': '产出类型',
    'appConfig.primaryOutput': '是否为主产出',
    'appConfig.nodeParams': '节点参数设置',
    'appConfig.otherSettings': '其他配置',
    'appConfig.enableCache': '启用结果缓存',
    'appConfig.enableQueue': '启用队列处理',
    
    // 页面构建相关
    'pageBuilder.componentLibrary': '组件库',
    'pageBuilder.searchComponents': '搜索组件...',
    'pageBuilder.basicComponents': '基础组件',
    'pageBuilder.promptComponents': '提示词组件',
    'pageBuilder.selectionComponents': '选择组件',
    'pageBuilder.imageComponents': '图像组件',
    'pageBuilder.customComponents': '自定义组件',
    'pageBuilder.availableParams': '可用参数',
    'pageBuilder.buildArea': '页面构建区',
    'pageBuilder.preview': '预览',
    'pageBuilder.componentsCount': '个组件',
    'pageBuilder.dragHint': '从左侧组件库拖拽组件到此处开始构建页面',
    'pageBuilder.clickHint': '或点击组件添加',
    'pageBuilder.propertyPanel': '属性面板',
    'pageBuilder.selectComponentHint': '请选择一个组件进行编辑',
    'pageBuilder.basicProperties': '基本属性',
    'pageBuilder.mcpProperties': 'MCP属性',
    'pageBuilder.title': '标题',
    'pageBuilder.paramKey': '参数名',
    'pageBuilder.bindWorkflowParam': '绑定工作流参数',
    'pageBuilder.defaultValue': '默认值',
    'pageBuilder.options': '选项 (每行一个)',
    'pageBuilder.minValue': '最小值',
    'pageBuilder.maxValue': '最大值',
    'pageBuilder.maxUploadCount': '最大上传数量',
    'pageBuilder.descriptionText': '说明文字',
    'pageBuilder.enterDescription': '请输入说明文字',
    'pageBuilder.paramType': '参数类型',
    'pageBuilder.validationRules': '验证规则',
    'pageBuilder.rateLimit': '速率限制',
    'pageBuilder.requests': '请求数',
    'pageBuilder.timeWindow': '时间窗口(秒)',
    'pageBuilder.uploadImage': '上传图片',
    'pageBuilder.textInput': '文本输入',
    'pageBuilder.select': '选择器',
    'pageBuilder.slider': '滑块',
    'pageBuilder.textarea': '多行文本',
    'pageBuilder.checkbox': '复选框',
    'pageBuilder.numberInput': '数字输入',
    'pageBuilder.colorPicker': '颜色选择器',
    'pageBuilder.advancedComponents': '高级组件',
    'pageBuilder.rangeSlider': '范围滑块',
    'pageBuilder.datePicker': '日期选择器',
    'pageBuilder.timePicker': '时间选择器',
    'pageBuilder.positivePrompt': '正向提示词',
    'pageBuilder.negativePrompt': '负向提示词',
    'pageBuilder.promptTemplate': '提示词模板(Biz)',
    'pageBuilder.modelSelect': '模型选择',
    'pageBuilder.loraSelect': 'LoRA 选择',
    'pageBuilder.presetSelect': '预设效果模板(Biz)',
    'pageBuilder.uploadSingleImage': '上传单张图片',
    'pageBuilder.uploadMultipleImages': '上传多张连续图片',
    'pageBuilder.customComponent': '添加自定义组件',
    'pageBuilder.customText': '添加中文说明',
    
    // 应用构建器相关
    'appBuilder.title': 'ComfyUI 应用平台',
    'appBuilder.serviceManagement': '服务管理',
    'appBuilder.uploadWorkflow': '上传工作流',
    'appBuilder.appConfig': '应用配置',
    'appBuilder.pageBuilder': '搭建页面',
    'appBuilder.runApp': '运行应用',
    
    // 通用
    'common.next': '下一步',
    'common.previous': '上一步',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.preview': '预览',
    'common.exitPreview': '退出预览',
    'language': 'zh'
  },
  en: {
    // Application Configuration
    'appConfig.title': 'Application Configuration',
    'appConfig.basicTab': 'Basic Configuration',
    'appConfig.advancedTab': 'Advanced Configuration',
    'appConfig.appName': 'Application Name',
    'appConfig.timeout': 'Timeout (seconds)',
    'appConfig.outputNodes': 'Output Nodes Configuration',
    'appConfig.addNode': 'Add Output Node',
    'appConfig.nodeId': 'Select Output Node',
    'appConfig.port': 'Select Port',
    'appConfig.outputType': 'Output Type',
    'appConfig.primaryOutput': 'Primary Output',
    'appConfig.nodeParams': 'Node Parameters',
    'appConfig.otherSettings': 'Other Settings',
    'appConfig.enableCache': 'Enable Result Caching',
    'appConfig.enableQueue': 'Enable Queue Processing',
    
    // Page Builder
    'pageBuilder.componentLibrary': 'Component Library',
    'pageBuilder.searchComponents': 'Search components...',
    'pageBuilder.basicComponents': 'Basic Components',
    'pageBuilder.promptComponents': 'Prompt Components',
    'pageBuilder.selectionComponents': 'Selection Components',
    'pageBuilder.imageComponents': 'Image Components',
    'pageBuilder.customComponents': 'Custom Components',
    'pageBuilder.availableParams': 'Available Parameters',
    'pageBuilder.buildArea': 'Page Building Area',
    'pageBuilder.preview': 'Preview',
    'pageBuilder.componentsCount': 'components',
    'pageBuilder.dragHint': 'Drag components from the left library to start building the page',
    'pageBuilder.clickHint': 'or click to add components',
    'pageBuilder.propertyPanel': 'Property Panel',
    'pageBuilder.selectComponentHint': 'Please select a component to edit',
    'pageBuilder.basicProperties': 'Basic Properties',
    'pageBuilder.mcpProperties': 'MCP Properties',
    'pageBuilder.title': 'Title',
    'pageBuilder.paramKey': 'Parameter Key',
    'pageBuilder.bindWorkflowParam': 'Bind Workflow Parameter',
    'pageBuilder.defaultValue': 'Default Value',
    'pageBuilder.options': 'Options (one per line)',
    'pageBuilder.minValue': 'Min Value',
    'pageBuilder.maxValue': 'Max Value',
    'pageBuilder.maxUploadCount': 'Max Upload Count',
    'pageBuilder.descriptionText': 'Description Text',
    'pageBuilder.enterDescription': 'Enter description text',
    'pageBuilder.paramType': 'Parameter Type',
    'pageBuilder.validationRules': 'Validation Rules',
    'pageBuilder.rateLimit': 'Rate Limit',
    'pageBuilder.requests': 'Requests',
    'pageBuilder.timeWindow': 'Time Window (seconds)',
    'pageBuilder.uploadImage': 'Upload Image',
    'pageBuilder.textInput': 'Text Input',
    'pageBuilder.select': 'Select',
    'pageBuilder.slider': 'Slider',
    'pageBuilder.textarea': 'Textarea',
    'pageBuilder.checkbox': 'Checkbox',
    'pageBuilder.numberInput': 'Number Input',
    'pageBuilder.colorPicker': 'Color Picker',
    'pageBuilder.advancedComponents': 'Advanced Components',
    'pageBuilder.rangeSlider': 'Range Slider',
    'pageBuilder.datePicker': 'Date Picker',
    'pageBuilder.timePicker': 'Time Picker',
    'pageBuilder.positivePrompt': 'Positive Prompt',
    'pageBuilder.negativePrompt': 'Negative Prompt',
    'pageBuilder.promptTemplate': 'Prompt Template (Biz)',
    'pageBuilder.modelSelect': 'Model Select',
    'pageBuilder.loraSelect': 'LoRA Select',
    'pageBuilder.presetSelect': 'Preset Template (Biz)',
    'pageBuilder.uploadSingleImage': 'Upload Single Image',
    'pageBuilder.uploadMultipleImages': 'Upload Multiple Images',
    'pageBuilder.customComponent': 'Add Custom Component',
    'pageBuilder.customText': 'Add Chinese Description',
    
    // App Builder
    'appBuilder.title': 'ComfyUI Application Platform',
    'appBuilder.serviceManagement': 'Service Management',
    'appBuilder.uploadWorkflow': 'Upload Workflow',
    'appBuilder.appConfig': 'Application Configuration',
    'appBuilder.pageBuilder': 'Page Builder',
    'appBuilder.runApp': 'Run Application',
    
    // Common
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.preview': 'Preview',
    'common.exitPreview': 'Exit Preview',
    'language': 'en'
  }
};

const useTranslation = () => {
  const [language, setLanguage] = useState('zh');
  const [translationsObj, setTranslationsObj] = useState(translations.zh);

  useEffect(() => {
    setTranslationsObj(translations[language] || translations.zh);
  }, [language]);

  const t = (key) => {
    return translationsObj[key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
  };

  return {
    t,
    language,
    changeLanguage
  };
};

export default useTranslation;