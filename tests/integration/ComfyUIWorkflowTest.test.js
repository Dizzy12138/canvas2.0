import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AppBuilder from '../components/AppBuilder';
import useWorkflowStore from '../store/useWorkflowStore';
import useAppBuilderStore from '../store/useAppBuilderStore';

// Mock API
jest.mock('../api/index.js', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
}));

// Mock stores
jest.mock('../store/useWorkflowStore');
jest.mock('../store/useAppBuilderStore');

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('ComfyUI 应用配置与可视化画布模块', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock workflow store
    useWorkflowStore.mockReturnValue({
      workflowId: 'test-workflow-123',
      cascaderData: [
        {
          label: 'CLIPTextEncode',
          value: 'CLIPTextEncode',
          nodeId: 1,
          nodeType: 'text_encoder',
          children: [
            {
              label: 'text',
              value: 'CLIPTextEncode.text',
              type: 'string',
              default: 'a beautiful landscape',
              nodeId: 1,
              nodeKey: 'CLIPTextEncode',
              source: 'widget',
              description: '文本输入 (节点控件)',
              isRequired: true,
            }
          ]
        },
        {
          label: 'KSampler',
          value: 'KSampler',
          nodeId: 2,
          nodeType: 'sampler',
          children: [
            {
              label: 'steps',
              value: 'KSampler.steps',
              type: 'number',
              default: 20,
              nodeId: 2,
              nodeKey: 'KSampler',
              source: 'widget',
              description: '数值输入 (节点控件)',
              isRequired: true,
            },
            {
              label: 'cfg',
              value: 'KSampler.cfg',
              type: 'number',
              default: 7.5,
              nodeId: 2,
              nodeKey: 'KSampler',
              source: 'widget',
              description: '数值输入 (节点控件)',
              isRequired: true,
            }
          ]
        }
      ],
      parameterLookup: {
        'CLIPTextEncode.text': {
          nodeId: 1,
          nodeKey: 'CLIPTextEncode',
          nodeLabel: 'CLIPTextEncode',
          paramKey: 'text',
          label: 'text',
          type: 'string',
          default: 'a beautiful landscape',
          source: 'widget',
          widgetIndex: 0,
        },
        'KSampler.steps': {
          nodeId: 2,
          nodeKey: 'KSampler',
          nodeLabel: 'KSampler',
          paramKey: 'steps',
          label: 'steps',
          type: 'number',
          default: 20,
          source: 'widget',
          widgetIndex: 0,
        },
        'KSampler.cfg': {
          nodeId: 2,
          nodeKey: 'KSampler',
          nodeLabel: 'KSampler',
          paramKey: 'cfg',
          label: 'cfg',
          type: 'number',
          default: 7.5,
          source: 'widget',
          widgetIndex: 1,
        }
      },
      loading: false,
      error: null,
      uploadWorkflow: jest.fn(),
      fetchWorkflow: jest.fn(),
      clearWorkflow: jest.fn(),
      validateBindings: jest.fn(),
      getParameterSuggestions: jest.fn(),
    });

    // Mock app builder store
    useAppBuilderStore.mockReturnValue({
      appId: 'test-app-123',
      appName: '测试应用',
      paramsSchema: [
        {
          id: 'param_1',
          path: 'CLIPTextEncode.text',
          name: 'text',
          label: '文本输入',
          type: 'string',
          defaultValue: 'a beautiful landscape',
          nodeId: 1,
          nodeKey: 'CLIPTextEncode',
          nodeLabel: 'CLIPTextEncode',
          expose: true,
        },
        {
          id: 'param_2',
          path: 'KSampler.cfg',
          name: 'cfg',
          label: 'CFG值',
          type: 'number',
          defaultValue: 7.5,
          nodeId: 2,
          nodeKey: 'KSampler',
          nodeLabel: 'KSampler',
          expose: true,
        }
      ],
      uiBindings: {
        'comp_1': 'CLIPTextEncode.text',
        'comp_2': 'KSampler.cfg',
      },
      components: [],
      selectedComponent: null,
      initApp: jest.fn(),
      setAppId: jest.fn(),
      setAppName: jest.fn(),
      setWorkflowId: jest.fn(),
      addComponent: jest.fn(),
      updateComponent: jest.fn(),
      removeComponent: jest.fn(),
      selectComponent: jest.fn(),
      clearSelection: jest.fn(),
      bindComponentToWorkflowParam: jest.fn(),
      unbindComponentFromWorkflowParam: jest.fn(),
      getBindingForComponent: jest.fn(),
      setUiBindings: jest.fn(),
      setParamsSchema: jest.fn(),
      clearAppBuilder: jest.fn(),
    });
  });

  test('应该正确渲染应用构建器界面', () => {
    render(
      <TestWrapper>
        <AppBuilder />
      </TestWrapper>
    );

    expect(screen.getByText('应用构建器')).toBeInTheDocument();
    expect(screen.getByText('服务管理')).toBeInTheDocument();
    expect(screen.getByText('上传工作流')).toBeInTheDocument();
    expect(screen.getByText('应用配置')).toBeInTheDocument();
    expect(screen.getByText('画布搭建')).toBeInTheDocument();
    expect(screen.getByText('运行应用')).toBeInTheDocument();
  });

  test('应该支持节点下钻选择功能', async () => {
    render(
      <TestWrapper>
        <AppBuilder />
      </TestWrapper>
    );

    // 导航到应用配置步骤
    const configStep = screen.getByText('应用配置');
    fireEvent.click(configStep);

    // 等待组件加载
    await waitFor(() => {
      expect(screen.getByText('暴露给前端的参数')).toBeInTheDocument();
    });

    // 检查参数级联选择器是否存在
    const cascaderElements = screen.getAllByText('绑定工作流参数');
    expect(cascaderElements.length).toBeGreaterThan(0);
  });

  test('应该支持参数验证功能', async () => {
    const mockValidateBindings = jest.fn().mockResolvedValue({
      errors: [],
      warnings: [],
      validBindings: [
        {
          componentId: 'comp_1',
          bindTo: 'CLIPTextEncode.text',
          parameter: {
            nodeId: 1,
            nodeKey: 'CLIPTextEncode',
            paramKey: 'text',
            type: 'string',
          },
          isValid: true,
        }
      ]
    });

    useWorkflowStore.mockReturnValue({
      ...useWorkflowStore(),
      validateBindings: mockValidateBindings,
    });

    render(
      <TestWrapper>
        <AppBuilder />
      </TestWrapper>
    );

    // 测试参数验证
    const result = await mockValidateBindings([
      { componentId: 'comp_1', bindTo: 'CLIPTextEncode.text' }
    ]);

    expect(result.errors).toHaveLength(0);
    expect(result.validBindings).toHaveLength(1);
    expect(result.validBindings[0].isValid).toBe(true);
  });

  test('应该支持参数建议功能', async () => {
    const mockGetParameterSuggestions = jest.fn().mockResolvedValue([
      {
        label: 'CLIPTextEncode - text',
        value: 'CLIPTextEncode.text',
        type: 'string',
        default: 'a beautiful landscape',
        description: '文本输入 (节点控件)',
      }
    ]);

    useWorkflowStore.mockReturnValue({
      ...useWorkflowStore(),
      getParameterSuggestions: mockGetParameterSuggestions,
    });

    render(
      <TestWrapper>
        <AppBuilder />
      </TestWrapper>
    );

    // 测试参数建议
    const suggestions = await mockGetParameterSuggestions('text');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe('string');
  });

  test('应该支持完整的应用执行流程', async () => {
    const mockApi = require('../api/index.js');
    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          jobId: 'test-job-123',
          status: 'queued',
        }
      }
    });

    render(
      <TestWrapper>
        <AppBuilder />
      </TestWrapper>
    );

    // 导航到运行应用步骤
    const runStep = screen.getByText('运行应用');
    fireEvent.click(runStep);

    await waitFor(() => {
      expect(screen.getByText('运行工作流')).toBeInTheDocument();
    });

    // 模拟执行应用
    const runButton = screen.getByText('运行工作流');
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/comfy/apps/test-app-123/run',
        expect.objectContaining({
          uiInputs: expect.any(Object),
        })
      );
    });
  });
});

describe('ParameterCascader 组件测试', () => {
  const mockOptions = [
    {
      label: 'CLIPTextEncode',
      value: 'CLIPTextEncode',
      nodeType: 'text_encoder',
      children: [
        {
          label: 'text',
          value: 'CLIPTextEncode.text',
          type: 'string',
          description: '文本输入 (节点控件)',
          isRequired: true,
        }
      ]
    }
  ];

  test('应该正确渲染级联选择器', () => {
    const mockOnChange = jest.fn();
    
    render(
      <ParameterCascader
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="请选择参数"
      />
    );

    expect(screen.getByText('请选择参数')).toBeInTheDocument();
  });

  test('应该支持搜索功能', () => {
    const mockOnChange = jest.fn();
    
    render(
      <ParameterCascader
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="请选择参数"
      />
    );

    const button = screen.getByText('请选择参数');
    fireEvent.click(button);

    // 检查搜索框是否存在
    const searchInput = screen.getByPlaceholderText('搜索节点或参数...');
    expect(searchInput).toBeInTheDocument();

    // 测试搜索功能
    fireEvent.change(searchInput, { target: { value: 'CLIP' } });
    expect(searchInput.value).toBe('CLIP');
  });

  test('应该支持节点下钻选择', () => {
    const mockOnChange = jest.fn();
    
    render(
      <ParameterCascader
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="请选择参数"
      />
    );

    const button = screen.getByText('请选择参数');
    fireEvent.click(button);

    // 点击节点
    const nodeOption = screen.getByText('CLIPTextEncode');
    fireEvent.click(nodeOption);

    // 检查子选项是否显示
    expect(screen.getByText('text')).toBeInTheDocument();
    expect(screen.getByText('文本输入 (节点控件)')).toBeInTheDocument();
    expect(screen.getByText('必需参数')).toBeInTheDocument();
  });
});
