import React, { useState, useEffect } from 'react';
import WorkflowUploader from './WorkflowUploader';
import AppConfigForm from './AppConfigForm';
import PageBuilder from './PageBuilder';
import AppRunner from './AppRunner';
import ServiceManager from './ServiceManager';
import useTranslation from '../hooks/useTranslation';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import useWorkflowStore from '../store/useWorkflowStore';
import useAppBuilderStore from '../store/useAppBuilderStore';

const AppBuilder = () => {
  const { t, changeLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { step } = useParams();

  const { workflow, fetchWorkflow } = useWorkflowStore();
  const { appId, initApp } = useAppBuilderStore();

  // 根据URL参数或默认值设置当前步骤
  const getCurrentStep = () => {
    if (location.pathname.includes('/app-builder/1')) return 1;
    if (location.pathname.includes('/app-builder/2')) return 2;
    if (location.pathname.includes('/app-builder/3')) return 3;
    if (location.pathname.includes('/app-builder/4')) return 4;
    return 0; // 默认为服务管理步骤
  };

  const [currentStep, setCurrentStep] = useState(getCurrentStep());

  // 监听路由变化并更新当前步骤
  useEffect(() => {
    const newStep = getCurrentStep();
    if (newStep !== currentStep) {
      setCurrentStep(newStep);
    }
  }, [location.pathname]);

  // 如果有 appId，尝试加载应用数据
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const currentAppId = queryParams.get('appId');
    if (currentAppId && !appId) {
      // 假设有一个 API 来获取应用详情
      const fetchAppDetails = async () => {
        try {
          const response = await axios.get(`/api/apps/${currentAppId}`);
          initApp(response.data.data); // 初始化 AppBuilderStore
          fetchWorkflow(response.data.data.workflowId); // 加载关联的工作流
        } catch (error) {
          console.error('Failed to fetch app details:', error);
        }
      };
      // fetchAppDetails(); // 暂时注释，因为还没有 /api/apps/:appId 接口
    }
  }, [location.search, appId, initApp, fetchWorkflow]);

  const steps = [
    {
      title: t('appBuilder.serviceManagement'),
      content: <ServiceManager />,
    },
    {
      title: t('appBuilder.uploadWorkflow'),
      content: (
        <WorkflowUploader 
          onNext={(workflowId) => {
            // workflowId 从 useWorkflowStore 中获取
            setCurrentStep(2);
            navigate(`/app-builder/2?workflowId=${workflowId}`); // 导航到下一步
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
            setCurrentStep(3);
            navigate(`/app-builder/3?appId=${newAppId}`); // 导航到下一步
          }}
          onBack={() => {
            setCurrentStep(1);
            navigate(`/app-builder/1?workflowId=${workflow?.workflow_id}`); // 返回上一步
          }}
        />
      ),
    },
    {
      title: t('appBuilder.pageBuilder'),
      content: (
        <PageBuilder
          onNext={() => {
            setCurrentStep(4);
            navigate(`/app-builder/4?appId=${appId}`); // 导航到下一步
          }}
          onBack={() => {
            setCurrentStep(2);
            navigate(`/app-builder/2?appId=${appId}`); // 返回上一步
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
    if (nextStep === 2 && workflow?.workflow_id) {
      newPath += `?workflowId=${workflow.workflow_id}`;
    } else if (appId) {
      newPath += `?appId=${appId}`;
    }
    navigate(newPath);
  };

  const prev = () => {
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    let newPath = `/app-builder/${prevStep}`;
    if (prevStep === 1 && workflow?.workflow_id) {
      newPath += `?workflowId=${workflow.workflow_id}`;
    } else if (appId) {
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
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full border-2
                    ${index <= currentStep 
                      ? 'border-blue-600 bg-blue-600 text-white' 
                      : 'border-gray-300 bg-white'
                    }
                  `}>
                    {index + 1}
                  </div>
                  <span className="ml-2 text-sm font-medium">{step.title}</span>
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
          <div className="min-h-[500px]">
            {steps[currentStep].content}
          </div>
          
          {currentStep > 0 && currentStep < steps.length - 1 && (
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
