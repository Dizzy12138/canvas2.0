import { useState, useEffect } from 'react';

const translations = {
  zh: {
    'appBuilder.title': '应用构建器',
    'appBuilder.serviceManagement': '服务管理',
    'appBuilder.uploadWorkflow': '上传工作流',
    'appBuilder.appConfig': '应用配置',
    'appBuilder.pageBuilder': '页面构建器',
    'appBuilder.runApp': '运行应用',
    'common.previous': '上一步',
    'common.next': '下一步',
    'pageBuilder.basicComponents': '基础组件',
    'pageBuilder.uploadImage': '图片上传',
    'pageBuilder.textInput': '文本输入',
    'pageBuilder.select': '选择框',
    'pageBuilder.slider': '滑块',
    'pageBuilder.numberInput': '数字输入',
    'pageBuilder.checkbox': '复选框',
    'pageBuilder.colorPicker': '颜色选择器',
    'pageBuilder.promptTemplate': '提示词模板',
    'pageBuilder.positivePrompt': '正向提示词',
    'pageBuilder.negativePrompt': '负向提示词',
    'pageBuilder.modelSelect': '模型选择',
    'pageBuilder.loraSelect': 'LoRA 选择',
    'pageBuilder.presetSelect': '预设选择',
    'pageBuilder.textarea': '多行文本',
    'pageBuilder.button': '按钮',
    'pageBuilder.imageDisplay': '图片展示',
    'pageBuilder.textDisplay': '文本展示',
    'pageBuilder.group': '分组',
    'pageBuilder.customComponent': '自定义组件',
    'language': 'zh'
  },
  en: {
    'appBuilder.title': 'App Builder',
    'appBuilder.serviceManagement': 'Service Management',
    'appBuilder.uploadWorkflow': 'Upload Workflow',
    'appBuilder.appConfig': 'App Configuration',
    'appBuilder.pageBuilder': 'Page Builder',
    'appBuilder.runApp': 'Run App',
    'common.previous': 'Previous',
    'common.next': 'Next',
    'pageBuilder.basicComponents': 'Basic Components',
    'pageBuilder.uploadImage': 'Image Upload',
    'pageBuilder.textInput': 'Text Input',
    'pageBuilder.select': 'Select',
    'pageBuilder.slider': 'Slider',
    'pageBuilder.numberInput': 'Number Input',
    'pageBuilder.checkbox': 'Checkbox',
    'pageBuilder.colorPicker': 'Color Picker',
    'pageBuilder.promptTemplate': 'Prompt Template',
    'pageBuilder.positivePrompt': 'Positive Prompt',
    'pageBuilder.negativePrompt': 'Negative Prompt',
    'pageBuilder.modelSelect': 'Model Select',
    'pageBuilder.loraSelect': 'LoRA Select',
    'pageBuilder.presetSelect': 'Preset Select',
    'pageBuilder.textarea': 'Textarea',
    'pageBuilder.button': 'Button',
    'pageBuilder.imageDisplay': 'Image Display',
    'pageBuilder.textDisplay': 'Text Display',
    'pageBuilder.group': 'Group',
    'pageBuilder.customComponent': 'Custom Component',
    'language': 'en'
  }
};

const useTranslation = () => {
  const [language, setLanguage] = useState('zh'); // Default language

  useEffect(() => {
    // You might want to load the language from localStorage or user settings
    const savedLang = localStorage.getItem('language');
    if (savedLang) {
      setLanguage(savedLang);
    }
  }, []);

  const t = (key) => {
    return translations[language][key] || key;
  };

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return { t, changeLanguage, language };
};

export default useTranslation;
