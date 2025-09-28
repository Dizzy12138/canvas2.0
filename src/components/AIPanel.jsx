import React, { useState } from 'react';
import { 
  Wand2, 
  Image, 
  Type, 
  Layers, 
  Zap, 
  Settings, 
  Play, 
  Square,
  Download,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

const aiModels = [
  { id: 'stable-diffusion', name: 'Stable Diffusion', description: '高质量图像生成' },
  { id: 'dall-e', name: 'DALL-E', description: '创意图像生成' },
  { id: 'midjourney', name: 'Midjourney Style', description: '艺术风格生成' },
];

const presetStyles = [
  { id: 'realistic', name: '写实', prompt: 'realistic, detailed, high quality' },
  { id: 'anime', name: '动漫', prompt: 'anime style, detailed, colorful' },
  { id: 'oil-painting', name: '油画', prompt: 'oil painting style, artistic, brushstrokes' },
  { id: 'watercolor', name: '水彩', prompt: 'watercolor style, soft, flowing' },
  { id: 'sketch', name: '素描', prompt: 'pencil sketch, black and white, detailed' },
  { id: 'cartoon', name: '卡通', prompt: 'cartoon style, colorful, cute' },
];

const AIPanel = ({ 
  onGenerate,
  isGenerating = false,
  className 
}) => {
  const [activeTab, setActiveTab] = useState('text-to-image');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('stable-diffusion');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [settings, setSettings] = useState({
    width: 512,
    height: 512,
    steps: 20,
    guidance: 7.5,
    seed: -1,
  });

  const tabs = [
    { id: 'text-to-image', name: '文本生图', icon: Type },
    { id: 'image-to-image', name: '图生图', icon: Image },
    { id: 'inpaint', name: '局部重绘', icon: Wand2 },
    { id: 'enhance', name: '图像增强', icon: Zap },
  ];

  const handleGenerate = () => {
    if (!prompt.trim() && activeTab === 'text-to-image') return;
    
    const request = {
      type: activeTab,
      prompt,
      negativePrompt,
      model: selectedModel,
      style: selectedStyle,
      settings,
    };
    
    onGenerate?.(request);
  };

  const handleStyleSelect = (style) => {
    setSelectedStyle(style.id);
    if (prompt && !prompt.includes(style.prompt)) {
      setPrompt(prev => prev ? `${prev}, ${style.prompt}` : style.prompt);
    }
  };

  return (
    <div className={clsx('panel p-4 space-y-4', className)}>
      <h3 className="text-sm font-medium text-gray-900">AI 生成</h3>

      {/* 标签页 */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center space-x-1 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors',
                {
                  'bg-primary-500 text-white': activeTab === tab.id,
                  'text-gray-500 hover:text-gray-700': activeTab !== tab.id,
                }
              )}
            >
              <tab.icon size={14} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 文本生图 */}
      {activeTab === 'text-to-image' && (
        <div className="space-y-4">
          {/* 提示词输入 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">描述 (提示词)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
              placeholder="描述你想要生成的图像..."
              maxLength={800}
            />
            <div className="text-xs text-gray-400 text-right">
              {prompt.length}/800
            </div>
          </div>

          {/* 负面提示词 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">负面提示词 (可选)</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="描述不想要的元素..."
            />
          </div>

          {/* 风格预设 */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">风格预设</label>
            <div className="grid grid-cols-2 gap-2">
              {presetStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleSelect(style)}
                  className={clsx(
                    'p-2 text-xs border rounded-lg transition-colors text-left',
                    {
                      'bg-primary-500 text-white border-primary-500': selectedStyle === style.id,
                      'bg-white text-gray-700 border-gray-300 hover:bg-gray-50': selectedStyle !== style.id,
                    }
                  )}
                >
                  {style.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 图生图 */}
      {activeTab === 'image-to-image' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-gray-500">参考图像</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Image size={24} className="mx-auto text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">点击或拖拽上传参考图像</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500">变化描述</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              placeholder="描述你想要的变化..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-500">参考强度: {settings.guidance}</label>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={settings.guidance}
              onChange={(e) => setSettings(prev => ({ ...prev, guidance: Number(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>低</span>
              <span>高</span>
            </div>
          </div>
        </div>
      )}

      {/* 模型选择 */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">AI 模型</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {aiModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.description}
            </option>
          ))}
        </select>
      </div>

      {/* 高级设置 */}
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer text-xs text-gray-500 hover:text-gray-700">
          <span>高级设置</span>
          <Settings size={14} className="group-open:rotate-90 transition-transform" />
        </summary>
        
        <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
          {/* 图像尺寸 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">宽度</label>
              <select
                value={settings.width}
                onChange={(e) => setSettings(prev => ({ ...prev, width: Number(e.target.value) }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={256}>256px</option>
                <option value={512}>512px</option>
                <option value={768}>768px</option>
                <option value={1024}>1024px</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">高度</label>
              <select
                value={settings.height}
                onChange={(e) => setSettings(prev => ({ ...prev, height: Number(e.target.value) }))}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value={256}>256px</option>
                <option value={512}>512px</option>
                <option value={768}>768px</option>
                <option value={1024}>1024px</option>
              </select>
            </div>
          </div>

          {/* 生成步数 */}
          <div>
            <label className="text-xs text-gray-500">生成步数: {settings.steps}</label>
            <input
              type="range"
              min="10"
              max="50"
              value={settings.steps}
              onChange={(e) => setSettings(prev => ({ ...prev, steps: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* 随机种子 */}
          <div>
            <label className="text-xs text-gray-500">随机种子</label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={settings.seed === -1 ? '' : settings.seed}
                onChange={(e) => setSettings(prev => ({ ...prev, seed: e.target.value ? Number(e.target.value) : -1 }))}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="随机"
              />
              <button
                onClick={() => setSettings(prev => ({ ...prev, seed: Math.floor(Math.random() * 1000000) }))}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="随机种子"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>
      </details>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || (!prompt.trim() && activeTab === 'text-to-image')}
        className={clsx(
          'w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200',
          {
            'bg-primary-500 text-white hover:bg-primary-600': !isGenerating && prompt.trim(),
            'bg-gray-300 text-gray-500 cursor-not-allowed': isGenerating || !prompt.trim(),
          }
        )}
      >
        {isGenerating ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            <span>生成中...</span>
          </>
        ) : (
          <>
            <Play size={16} />
            <span>开始生成</span>
          </>
        )}
      </button>

      {/* 生成历史快速访问 */}
      <div className="pt-2 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">最近生成</span>
          <button className="text-xs text-primary-500 hover:text-primary-600">
            查看全部
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {/* 这里显示最近的3个生成结果缩略图 */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
              <span className="text-xs text-gray-400">#{i}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPanel;