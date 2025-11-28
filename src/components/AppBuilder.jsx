import React, { useState, useEffect } from 'react';
import api from '@/api/index.js';
import WorkflowUploader from './WorkflowUploader';
import AppConfigForm from './AppConfigForm';
import PageBuilder from './PageBuilder';
import AppRunner from './AppRunner';
import AppList from './AppList';
import useTranslation from '../hooks/useTranslation';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import useWorkflowStore from '../store/useWorkflowStore';
import useAppBuilderStore from '../store/useAppBuilderStore';

const AppBuilder = () => {
  const { t, changeLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { step } = useParams();

  const { workflowId, fetchWorkflow, clearWorkflow } = useWorkflowStore();
  const { appId, initApp, clearAppBuilder } = useAppBuilderStore();

  // 根据URL参数或默认值设置当前步骤
  const getCurrentStep = () => {
    if (location.pathname.includes('/app-builder/1')) return 1; // 应用管理
    if (location.pathname.includes('/app-builder/2')) return 2; // 上传工作流
    if (location.pathname.includes('/app-builder/3')) return 3; // 应用配置
    if (location.pathname.includes('/app-builder/4')) return 4; // 页面构建器
    if (location.pathname.includes('/app-builder/5')) return 5; // 运行应用
    return 1; // 默认为应用管理步骤
  };

  const [currentStep, setCurrentStep] = useState(getCurrentStep());

  // 监听路由变化并更新当前步骤
  useEffect(() => {
    const newStep = getCurrentStep();
    if (newStep !== currentStep) {
      setCurrentStep(newStep);
    }
  }, [location.pathname]);

  // 监听步骤变化，确保新增工作流时清空旧数据
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const currentAppId = queryParams.get('appId');
    const currentStepNum = getCurrentStep();
    
    // 如果进入步骤1（应用管理），清空所有数据，准备新建流程
    if (currentStepNum === 1) {
      console.log('Entering app management, clearing all data');
      clearAppBuilder();
      clearWorkflow();
    }
    // 如果进入步骤2（上传工作流）且没有 appId，说明是新增流程，清空旧数据
    else if (currentStepNum === 2 && !currentAppId) {
      console.log('Clearing app builder store for new workflow');
      clearAppBuilder();
    }
  }, [location.pathname, location.search, clearAppBuilder, clearWorkflow]);

  // 如果有 appId，尝试加载应用数据
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const currentAppId = queryParams.get('appId');
    if (currentAppId) {
      // 假设有一个 API 来获取应用详情
      const fetchAppDetails = async () => {
        try {
          console.log('Fetching app details for:', currentAppId);
          const response = await api.get(`/apps/${currentAppId}`);
          console.log('App data received:', response.data.data);
          initApp(response.data.data); // 初始化 AppBuilderStore
          if (response.data.data.workflowId) {
            fetchWorkflow(response.data.data.workflowId); // 加载关联的工作流
          }
        } catch (error) {
          console.error('Failed to fetch app details:', error);
        }
      };
      fetchAppDetails(); // 启用应用数据加载
    }
  }, [location.search, initApp, fetchWorkflow]);

  const steps = [
    {
      title: t('appBuilder.appManagement'),
      content: <AppList />,
    },
    {
      title: t('appBuilder.uploadWorkflow'),
      content: (
        <WorkflowUploader 
          onNext={(workflowId) => {
            // workflowId 从 useWorkflowStore 中获取
            setCurrentStep(3);
            navigate(`/app-builder/3?workflowId=${workflowId}`); // 导航到应用配置
          }} 
        />
      ),
    },
    {
      title: t('appBuilder.appConfig'),
      content: (
        <AppConfigForm 
          onNext={(newAppId) => {
            useAppBuilderStore.getState().setAppId(newAppId); // 更新 appId
            setCurrentStep(4);
            navigate(`/app-builder/4?appId=${newAppId}`); // 导航到页面构建器
          }}
          onBack={() => {
            setCurrentStep(1);
            navigate(`/app-builder/1`); // 返回工作流管理
          }}
        />
      ),
    },
    {
      title: t('appBuilder.pageBuilder'),
      content: (
        <PageBuilder
          onNext={() => {
            setCurrentStep(5);
            navigate(`/app-builder/5?appId=${appId}`); // 导航到运行应用
          }}
          onBack={() => {
            setCurrentStep(3);
            navigate(`/app-builder/3?appId=${appId}`); // 返回应用配置
          }}
        />
      ),
    },
    {
      title: t('appBuilder.runApp'),
      content: (
        <AppRunner />
      ),
    },
  ];

  const next = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    // 根据当前步骤和是否存在 appId/workflowId 来构建 URL
    let newPath = `/app-builder/${nextStep}`;
    if (nextStep === 2 && workflowId) {
      newPath += `?workflowId=${workflowId}`;
    } else if (appId) {
      newPath += `?appId=${appId}`;
    }
    navigate(newPath);
  };

  const prev = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    let newPath = `/app-builder/${prevStep}`;
    if (prevStep === 1 && workflowId) {
      newPath += `?workflowId=${workflowId}`;
    } else if (appId) {
      newPath += `?appId=${appId}`;
    }
    navigate(newPath);
  };

  // 跳转到指定步骤
  const goToStep = (targetStep) => {
    if (targetStep < 1 || targetStep > steps.length) return;
    if (targetStep === currentStep) return;
    
    setCurrentStep(targetStep);
    let newPath = `/app-builder/${targetStep}`;
    
    // 根据目标步骤和当前状态构建 URL
    if (targetStep === 2 && workflowId) {
      newPath += `?workflowId=${workflowId}`;
    } else if (appId && targetStep > 1) {
      newPath += `?appId=${appId}`;
    }
    
    navigate(newPath);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('appBuilder.title')}</h1>
          {/* 语言切换 */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => changeLanguage('zh')}
              className={`px-3 py-1 rounded text-sm ${t('language') === 'zh' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              中文
            </button>
            <button 
              onClick={() => changeLanguage('en')}
              className={`px-3 py-1 rounded text-sm ${t('language') === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              English
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* 步骤指示器 */}
        <div className="mb-8">
          <ol className="flex items-center w-full">
            {steps.map((step, index) => (
              <li 
                key={index} 
                className={`flex items-center ${index < steps.length - 1 ? 'w-full' : ''}`}
              >
                <div 
                  className={`flex items-center ${
                    index <= currentStep 
                      ? 'text-blue-600 dark:text-blue-500' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  <button
                    onClick={() => goToStep(index + 1)}
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all
                      ${index <= currentStep 
                        ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700' 
                        : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
                      }
                      cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                    `}
                    title={`跳转到步骤 ${index + 1}: ${step.title}`}
                  >
                    {index + 1}
                  </button>
                  <button
                    onClick={() => goToStep(index + 1)}
                    className="ml-2 text-sm font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
                    title={`跳转到步骤 ${index + 1}: ${step.title}`}
                  >
                    {step.title}
                  </button>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-auto mx-2 h-1 bg-gray-200 rounded-lg dark:bg-gray-700"></div>
                )}
              </li>
            ))}
          </ol>
        </div>
        
        {/* 内容区域 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className={currentStep === 4 ? "h-[calc(100vh-280px)]" : "min-h-[500px]"}>
            {steps[currentStep - 1]?.content}
          </div>
          
          {currentStep > 1 && currentStep < steps.length - 1 && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={prev}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.previous')}
              </button>
              {currentStep < steps.length - 2 && (
                <button
                  onClick={next}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.next')}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AppBuilder;
