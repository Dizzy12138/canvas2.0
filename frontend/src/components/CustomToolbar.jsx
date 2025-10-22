import React from 'react';
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
  FileText
} from 'lucide-react';

const CustomToolbar = ({ 
  workflowData, 
  workflowParams, 
  onParameterChange,
  onGenerate,
  onSaveWorkflow,
  onLoadWorkflow,
  className 
}) => {
  // 渲染自定义工具按钮
  const renderCustomTools = () => {
    if (!workflowData || !workflowData.data || !workflowData.data.tools) {
      return null;
    }

    return workflowData.data.tools.map((tool, index) => {
      const icons = {
        play: Play,
        settings: Settings,
        eye: Eye,
        eyeOff: EyeOff,
        edit: Edit3,
        trash: Trash2,
        plus: Plus,
        save: Save,
        upload: Upload,
        download: Download,
        zap: Zap,
        layers: Layers,
        gitBranch: GitBranch,
        fileText: FileText
      };

      const IconComponent = icons[tool.icon] || Play;
      
      return (
        <button
          key={index}
          onClick={() => tool.action && tool.action(workflowParams)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          title={tool.title || tool.name}
        >
          <IconComponent className="w-4 h-4" />
        </button>
      );
    });
  };

  // 渲染参数快捷调整按钮
  const renderParameterShortcuts = () => {
    if (!workflowParams) return null;

    // 查找常用的参数进行快捷调整
    const commonParams = [
      { key: 'steps', label: '步数', icon: 'settings' },
      { key: 'cfg', label: 'CFG', icon: 'zap' },
      { key: 'seed', label: '种子', icon: 'gitBranch' }
    ];

    return commonParams.map(param => {
      if (workflowParams.hasOwnProperty(param.key)) {
        const value = workflowParams[param.key];
        const icons = {
          settings: Settings,
          zap: Zap,
          gitBranch: GitBranch
        };
        
        const IconComponent = icons[param.icon] || Settings;
        
        return (
          <div key={param.key} className="flex items-center px-2 py-1 rounded-md bg-gray-100">
            <IconComponent className="w-3 h-3 text-gray-500 mr-1" />
            <span className="text-xs text-gray-700">{param.label}:</span>
            <span className="text-xs font-medium text-gray-900 ml-1">{value}</span>
          </div>
        );
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div className={`flex flex-col bg-white border-r border-gray-200 ${className}`}>
      {/* 主要工具按钮 */}
      <div className="p-2 border-b border-gray-200">
        <div className="flex flex-col space-y-1">
          <button
            onClick={onGenerate}
            className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            title="生成图像"
          >
            <Play className="w-4 h-4" />
          </button>
          
          <button
            onClick={onSaveWorkflow}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="保存工作流"
          >
            <Save className="w-4 h-4" />
          </button>
          
          <button
            onClick={onLoadWorkflow}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            title="加载工作流"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* 自定义工具按钮 */}
      {(workflowData && workflowData.data && workflowData.data.tools) && (
        <div className="p-2 border-b border-gray-200">
          <div className="flex flex-col space-y-1">
            {renderCustomTools()}
          </div>
        </div>
      )}
      
      {/* 参数快捷调整 */}
      {workflowParams && Object.keys(workflowParams).length > 0 && (
        <div className="p-2 flex-1 overflow-y-auto">
          <div className="text-xs text-gray-500 mb-2 px-1">参数快捷调整</div>
          <div className="space-y-2">
            {renderParameterShortcuts()}
          </div>
        </div>
      )}
      
      {/* 工作流信息 */}
      {workflowData && (
        <div className="p-2 border-t border-gray-200">
          <div className="text-xs text-gray-500 truncate" title={workflowData.name}>
            {workflowData.name}
          </div>
          {workflowData.data && workflowData.data.parameters && (
            <div className="text-xs text-gray-400 mt-1">
              {Object.keys(workflowData.data.parameters).length} 个参数
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomToolbar;