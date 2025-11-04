const { v4: uuidv4 } = require('uuid');

const sanitizeKeyPart = (value, fallback) => {
  if (!value && fallback) {
    return sanitizeKeyPart(fallback);
  }
  const cleaned = (value || '')
    .toString()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]+/g, '');

  if (cleaned) {
    return cleaned;
  }

  return fallback ? sanitizeKeyPart(fallback) : '';
};

const inferType = (typeHint, value, nodeType) => {
  const hint = (typeHint || '').toString().toLowerCase();
  const nodeTypeLower = (nodeType || '').toString().toLowerCase();
  
  // 基于节点类型推断参数类型
  if (nodeTypeLower.includes('loadimage') || nodeTypeLower.includes('image')) {
    if (hint.includes('path') || hint.includes('filename')) return 'image_path';
    if (hint.includes('image')) return 'image';
  }
  
  if (nodeTypeLower.includes('text') || nodeTypeLower.includes('prompt')) {
    return 'text';
  }
  
  if (nodeTypeLower.includes('model') || nodeTypeLower.includes('checkpoint')) {
    return 'model';
  }
  
  if (nodeTypeLower.includes('vae')) {
    return 'vae';
  }
  
  if (nodeTypeLower.includes('sampler') || nodeTypeLower.includes('k_sampler')) {
    if (hint.includes('steps')) return 'steps';
    if (hint.includes('cfg')) return 'cfg';
    if (hint.includes('seed')) return 'seed';
    if (hint.includes('width') || hint.includes('height')) return 'dimension';
  }
  
  if (nodeTypeLower.includes('upscale') || nodeTypeLower.includes('scale')) {
    if (hint.includes('scale') || hint.includes('factor')) return 'scale_factor';
  }
  
  // 基于参数名称推断类型
  if (hint.includes('float') || hint.includes('int') || hint.includes('number')) {
    return 'number';
  }
  if (hint.includes('bool')) {
    return 'boolean';
  }
  if (hint.includes('image')) {
    return 'image';
  }
  if (hint.includes('tensor')) {
    return 'tensor';
  }
  if (hint.includes('conditioning')) {
    return 'conditioning';
  }
  if (hint.includes('string') || hint.includes('text')) {
    return 'text';
  }
  if (hint.includes('model')) {
    return 'model';
  }
  if (hint.includes('latent')) {
    return 'latent';
  }

  // 基于值类型推断
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';
  return 'text';
};

const asNodeArray = (jsonContent) => {
  if (!jsonContent) return [];
  
  // 标准 ComfyUI 格式：{ "nodes": { "1": {...}, "2": {...} } }
  if (Array.isArray(jsonContent.nodes)) {
    return jsonContent.nodes;
  }
  if (jsonContent.nodes && typeof jsonContent.nodes === 'object') {
    return Object.values(jsonContent.nodes);
  }
  
  // 直接节点格式：{ "1": {...}, "2": {...} } (没有 nodes 包装)
  if (typeof jsonContent === 'object' && !jsonContent.nodes) {
    const nodes = [];
    Object.entries(jsonContent).forEach(([key, value]) => {
      if (value && typeof value === 'object' && value.class_type) {
        nodes.push({
          id: key,
          ...value
        });
      }
    });
    return nodes;
  }
  
  return [];
};

const cloneWorkflow = (workflow) => {
  if (!workflow) return {};
  return JSON.parse(JSON.stringify(workflow));
};

const findNodeById = (workflow, nodeId) => {
  if (!workflow) {
    console.warn(`[findNodeById] workflow is null/undefined`);
    return null;
  }
  
  // 支持两种工作流格式：
  // 1. { nodes: { '1': {...}, '2': {...} } } 或 { nodes: [...] }
  // 2. { '1': {...}, '2': {...} } - 节点直接作为对象的属性
  let nodes = workflow.nodes;
  if (!nodes) {
    // 如果没有 nodes 属性，检查 workflow 本身是否就是节点对象
    // 检查 workflow 的键是否都是数字（节点ID）
    const keys = Object.keys(workflow);
    const allNumericKeys = keys.length > 0 && keys.every(key => /^\d+$/.test(key));
    if (allNumericKeys) {
      // workflow 本身就是节点对象，直接使用
      nodes = workflow;
      console.log(`[findNodeById] Using workflow as nodes object, nodeId=${nodeId}, available keys:`, keys);
    } else {
      console.warn(`[findNodeById] workflow.nodes is null/undefined, workflow keys:`, keys);
      return null;
    }
  }
  
  if (Array.isArray(nodes)) {
    const found = nodes.find((node) => Number(node?.id) === Number(nodeId));
    console.log(`[findNodeById] Array mode, nodeId=${nodeId}, found:`, found ? 'yes' : 'no');
    return found;
  }
  
  // 对象模式：支持数字键或字符串键
  const found = (
    nodes[nodeId] ||
    nodes[String(nodeId)] ||
    null
  );
  console.log(`[findNodeById] Object mode, nodeId=${nodeId}, found:`, found ? 'yes' : 'no', 'available nodeIds:', Object.keys(nodes || {}));
  return found;
};

const normaliseBindings = (bindings = []) => {
  if (Array.isArray(bindings)) {
    return bindings
      .filter((binding) => binding && binding.componentId && binding.bindTo)
      .map((binding) => ({
        componentId: binding.componentId,
        bindTo: binding.bindTo,
      }));
  }

  return Object.entries(bindings || {})
    .filter(([componentId, bindTo]) => componentId && bindTo)
    .map(([componentId, bindTo]) => ({ componentId, bindTo }));
};

class WorkflowService {
  // 自动识别输出节点
  static identifyOutputNodes(nodes) {
    const outputNodes = [];
    
    nodes.forEach((node, index) => {
      const nodeType = (node.class_type || node.type || '').toLowerCase();
      const nodeId = node.id ?? `node_${index}`;
      
      // 基于节点类型识别输出节点
      if (nodeType.includes('preview') || 
          nodeType.includes('save') || 
          nodeType.includes('output') ||
          nodeType.includes('display')) {
        outputNodes.push({
          id: nodeId,
          type: nodeType,
          name: `${nodeId}_${nodeType}`,
          outputType: 'image' // 默认为图像输出
        });
      }
      
      // 检查节点输出
      if (node.outputs && Array.isArray(node.outputs)) {
        node.outputs.forEach(output => {
          if (output.type && (output.type.includes('image') || output.type.includes('preview'))) {
            outputNodes.push({
              id: nodeId,
              type: nodeType,
              name: `${nodeId}_${output.name || 'output'}`,
              outputType: output.type,
              outputName: output.name
            });
          }
        });
      }
    });
    
    return outputNodes;
  }

  static parseWorkflow(jsonContent) {
    if (!jsonContent) {
      throw new Error('Invalid ComfyUI workflow JSON format.');
    }

    const workflowId = jsonContent.workflow_id || uuidv4();
    const nodesArray = asNodeArray(jsonContent);
    const nodeKeyTracker = {};
    const parameterLookup = {};

    const nodes = nodesArray.map((node) => {
      if (!node || typeof node !== 'object') {
        return null;
      }

      const numericId = Number(node.id ?? node.ID ?? node.uid);
      const nodeId = Number.isNaN(numericId) ? null : numericId;
      const fallbackName = node.type || node.class_type || `node_${nodeId ?? ''}`;
      const displayName = node.title || node.properties?.['Node name for S&R'] || fallbackName;
      const baseKey = sanitizeKeyPart(displayName, fallbackName) || `node_${nodeId ?? ''}`;
      const counter = (nodeKeyTracker[baseKey] || 0) + 1;
      nodeKeyTracker[baseKey] = counter;
      const nodeKey = counter === 1 ? baseKey : `${baseKey}_${counter}`;

      const inputs = [];

      const widgetValues = Array.isArray(node.widgets_values) ? node.widgets_values : [];
      const widgetDefs = Array.isArray(node.widgets) ? node.widgets : [];
      widgetValues.forEach((value, index) => {
        const widgetInfo = widgetDefs[index];
        const widgetName = Array.isArray(widgetInfo)
          ? widgetInfo[0]
          : widgetInfo?.name;
        const widgetType = Array.isArray(widgetInfo)
          ? widgetInfo[1]
          : widgetInfo?.type;
        const label = widgetName || `参数${index + 1}`;
        const paramKey = sanitizeKeyPart(widgetName, `widget_${index + 1}`);
        const bindPath = `${nodeKey}.${paramKey}`;
        const type = inferType(widgetType, value);

        parameterLookup[bindPath] = {
          nodeId,
          nodeKey,
          nodeLabel: displayName,
          paramKey,
          label,
          type,
          default: value,
          source: 'widget',
          widgetIndex: index,
          expose: true, // 默认暴露所有参数
        };

        inputs.push({
          id: `${nodeId ?? nodeKey}_widget_${index}`,
          key: paramKey,
          label,
          type,
          default: value,
          path: bindPath,
          source: 'widget',
          widgetIndex: index,
        });
      });

      if (Array.isArray(node.inputs)) {
        node.inputs.forEach((input, index) => {
          if (!input || typeof input !== 'object') return;
          const defaultValue = input.value ?? input.default ?? null;
          const label = input.name || `输入${index + 1}`;
          const paramKey = sanitizeKeyPart(label, `input_${index + 1}`);
          const bindPath = `${nodeKey}.${paramKey}`;
          const type = inferType(input.type, defaultValue);

          parameterLookup[bindPath] = {
            nodeId,
            nodeKey,
            nodeLabel: displayName,
            paramKey,
            label,
            type,
            default: defaultValue,
            source: 'input',
            inputIndex: index,
            originalName: input.name,
            // 释放所有参数以便前端可选，即使该输入已被连线
            expose: true,
          };

          inputs.push({
            id: `${nodeId ?? nodeKey}_input_${index}`,
            key: paramKey,
            label,
            type,
            default: defaultValue,
            path: bindPath,
            source: 'input',
            inputIndex: index,
            originalName: input.name,
          });
        });
      } else if (node.inputs && typeof node.inputs === 'object') {
        Object.entries(node.inputs).forEach(([key, value], index) => {
          const paramKey = sanitizeKeyPart(key, `input_${index + 1}`);
          const bindPath = `${nodeKey}.${paramKey}`;
          const type = inferType(null, value);

          parameterLookup[bindPath] = {
            nodeId,
            nodeKey,
            nodeLabel: displayName,
            paramKey,
            label: key,
            type,
            default: value,
            source: 'input-object',
            originalName: key,
            expose: true, // 默认暴露所有参数
          };

          inputs.push({
            id: `${nodeId ?? nodeKey}_input_obj_${index}`,
            key: paramKey,
            label: key,
            type,
            default: value,
            path: bindPath,
            source: 'input-object',
            originalName: key,
          });
        });
      }

      const outputs = [];
      if (Array.isArray(node.outputs)) {
        node.outputs.forEach((output, index) => {
          outputs.push({
            key: output?.name || `output_${index + 1}`,
            type: output?.type || 'any',
          });
        });
      }

      return {
        id: nodeId,
        name: displayName,
        type: node.type || node.class_type || 'unknown',
        key: nodeKey,
        inputs,
        outputs,
      };
    }).filter(Boolean);

    // 识别输出节点
    const outputNodes = WorkflowService.identifyOutputNodes(nodesArray);

    return {
      workflow_id: workflowId,
      nodes,
      parameterLookup,
      outputNodes,
    };
  }

  static getWorkflowAsCascader(workflowData) {
    if (!workflowData || !workflowData.nodes) {
      return [];
    }

    return workflowData.nodes
      // 不再过滤无 inputs 的节点，全部展示
      .map((node) => ({
        label: node.name,
        value: node.key,
        nodeId: node.id,
        nodeType: node.type,
        children: node.inputs
          // 全量显示，不再依赖 expose 过滤
          .map((input) => ({
            label: input.label || input.key,
            value: input.path,
            type: input.type,
            default: input.default,
            nodeId: node.id,
            nodeKey: node.key,
            source: input.source,
            description: this.getParameterDescription(input),
            isRequired: this.isParameterRequired(input),
          })),
      }))
      ;
  }

  static getParameterDescription(input) {
    // 根据参数类型和名称生成描述
    const typeDescriptions = {
      'string': '文本输入',
      'number': '数值输入',
      'boolean': '开关选择',
      'image': '图像文件',
      'tensor': '张量数据',
      'conditioning': '条件数据',
      'model': '模型文件',
      'latent': '潜在空间数据',
    };
    
    const sourceDescriptions = {
      'widget': '节点控件',
      'input': '输入连接',
      'input-object': '对象输入',
    };

    const typeDesc = typeDescriptions[input.type] || '未知类型';
    const sourceDesc = sourceDescriptions[input.source] || '未知来源';
    
    return `${typeDesc} (${sourceDesc})`;
  }

  static isParameterRequired(input) {
    // 判断参数是否必需
    if (input.default !== null && input.default !== undefined) {
      return false; // 有默认值，不是必需的
    }
    if (input.source === 'widget') {
      return true; // 控件参数通常是必需的
    }
    return false;
  }

  static validateParameterBindings(bindings, workflowData) {
    // 验证参数绑定的有效性
    const errors = [];
    const warnings = [];
    const validBindings = [];

    if (!Array.isArray(bindings)) {
      errors.push('绑定数据格式错误');
      return { errors, warnings, validBindings };
    }

    bindings.forEach((binding, index) => {
      if (!binding.componentId || !binding.bindTo) {
        errors.push(`绑定 ${index + 1}: 缺少组件ID或绑定路径`);
        return;
      }

      const parameter = workflowData.parameterLookup[binding.bindTo];
      if (!parameter) {
        errors.push(`绑定 ${index + 1}: 参数路径 "${binding.bindTo}" 不存在`);
        return;
      }

      // 检查重复绑定
      const duplicateBinding = validBindings.find(b => b.bindTo === binding.bindTo);
      if (duplicateBinding) {
        warnings.push(`参数 "${binding.bindTo}" 被多个组件绑定`);
      }

      validBindings.push({
        ...binding,
        parameter,
        isValid: true,
      });
    });

    return { errors, warnings, validBindings };
  }

  static getParameterSuggestions(workflowData, componentType) {
    // 根据组件类型推荐合适的参数
    const typeMapping = {
      'text': ['string'],
      'number': ['number'],
      'slider': ['number'],
      'select': ['string', 'number'],
      'checkbox': ['boolean'],
      'file': ['image', 'model'],
      'textarea': ['string'],
    };

    const compatibleTypes = typeMapping[componentType] || ['string', 'number'];
    
    return workflowData.nodes
      .filter(node => Array.isArray(node.inputs) && node.inputs.length > 0)
      .flatMap(node => 
        node.inputs
          .filter(input => compatibleTypes.includes(input.type))
          .map(input => ({
            label: `${node.name} - ${input.label}`,
            value: input.path,
            type: input.type,
            default: input.default,
            description: this.getParameterDescription(input),
          }))
      );
  }

  static constructExecutionPayload(appBindings, uiInputs, workflowFile) {
    if (!workflowFile) {
      throw new Error('workflowFile is required to construct payload');
    }

    const rawWorkflow = cloneWorkflow(workflowFile.rawWorkflow);
    const workflowId = workflowFile.workflowId || workflowFile.workflow_id || uuidv4();
    const parameters = workflowFile.parameters || workflowFile.parameterLookup || {};
    const bindings = normaliseBindings(appBindings);

    console.log(`[Payload] Starting payload construction`);
    console.log(`[Payload] Received uiInputs:`, JSON.stringify(uiInputs, null, 2));
    console.log(`[Payload] Normalised bindings:`, JSON.stringify(bindings, null, 2));

    const valuesByPath = {};

    // 只通过 bindings 映射 componentId 到 bindTo（参数路径）
    // uiInputs 的 key 是 componentId，需要通过 bindings 找到对应的 bindTo（参数路径）
    bindings.forEach(({ componentId, bindTo }) => {
      if (!bindTo || !componentId) return;
      if (Object.prototype.hasOwnProperty.call(uiInputs || {}, componentId)) {
        const value = uiInputs[componentId];
        valuesByPath[bindTo] = value;
        console.log(`[Payload] Mapped componentId=${componentId} to path=${bindTo}, value=`, value);
      }
    });

    // 如果 uiInputs 中的 key 本身就是参数路径（而不是 componentId），也支持直接使用
    // 这用于向后兼容或特殊情况
    if (uiInputs && typeof uiInputs === 'object') {
      Object.entries(uiInputs).forEach(([key, value]) => {
        // 如果 key 是参数路径（在 parameters 中存在），且还没有被 bindings 映射过，则使用
        if (parameters[key] && !valuesByPath[key]) {
          valuesByPath[key] = value;
          console.log(`[Payload] Using direct path=${key} from uiInputs, value=`, value);
        }
      });
    }

    const inputsPayload = {};

    console.log(`[Payload] Final valuesByPath:`, JSON.stringify(valuesByPath, null, 2));
    console.log(`[Payload] Total bindings: ${bindings.length}, Total parameters: ${Object.keys(parameters).length}`);

    Object.entries(valuesByPath).forEach(([path, value]) => {
      const metadata = parameters[path];
      if (!metadata) {
        console.warn(`[Payload] No metadata found for path=${path}, skipping`);
        return;
      }
      console.log(`[Payload] Processing path=${path}, metadata:`, JSON.stringify(metadata));

      inputsPayload[path] = value;
      const targetNode = metadata.nodeId != null
        ? findNodeById(rawWorkflow, metadata.nodeId)
        : null;

      if (!targetNode) {
        console.warn(`[Payload] Target node not found for nodeId=${metadata.nodeId}, path=${path}`);
        return;
      }
      
      console.log(`[Payload] Found target node ${metadata.nodeId} (${targetNode.class_type}), inputs before update:`, JSON.stringify(targetNode.inputs));

      try {
        if (metadata.source === 'widget' && Number.isInteger(metadata.widgetIndex)) {
        if (!Array.isArray(targetNode.widgets_values)) {
          targetNode.widgets_values = [];
        }
        
        // 处理 ComfyUI 上传的文件信息对象
        let finalValue = value;
        if (value && typeof value === 'object' && value.__comfyUpload) {
          // LoadImage 节点通常使用 [filename, subfolder] 格式
          // 但有些工作流可能只需要文件名字符串
          const nodeType = (targetNode.class_type || targetNode.type || '').toLowerCase();
          if (nodeType.includes('loadimage') || nodeType.includes('load_image')) {
            // LoadImage 节点：widgets_values 通常是 [filename, subfolder] 或 ["filename", "input"]
            if (metadata.widgetIndex === 0) {
              // 第一个参数是文件名
              finalValue = value.name;
            } else if (metadata.widgetIndex === 1 && value.subfolder) {
              // 第二个参数是subfolder
              finalValue = value.subfolder || 'input';
            }
          } else {
            // 其他节点类型，直接使用文件名
            finalValue = value.name;
          }
        }
        
        targetNode.widgets_values[metadata.widgetIndex] = finalValue;
        console.log(`[Payload] Set widget ${metadata.widgetIndex} of node ${metadata.nodeId} (${targetNode.class_type}) to:`, finalValue);
      } else if (metadata.source === 'input' && Number.isInteger(metadata.inputIndex)) {
        if (Array.isArray(targetNode.inputs)) {
          const targetInput = targetNode.inputs[metadata.inputIndex];
          if (targetInput) {
            delete targetInput.link;
            
            // 处理 ComfyUI 上传的文件信息对象
            let finalValue = value;
            if (value && typeof value === 'object' && value.__comfyUpload) {
              // input.value 应该是文件名字符串
              finalValue = value.name;
            }
            
            targetInput.value = finalValue;
            console.log(`[Payload] Set input ${metadata.inputIndex} of node ${metadata.nodeId} (${targetNode.class_type}) to:`, finalValue);
          }
        }
      } else if (metadata.source === 'input-object' && metadata.originalName) {
        // 确保 inputs 是一个对象（不是数组）
        if (!targetNode.inputs || Array.isArray(targetNode.inputs)) {
          targetNode.inputs = {};
        }
        
        // 处理 ComfyUI 上传的文件信息对象
        let finalValue = value;
        if (value && typeof value === 'object' && value.__comfyUpload) {
          // inputs 对象的属性值应该是文件名字符串
          // 对于 LoadImage 节点，inputs.image 需要文件名
          // 对于其他节点，也使用文件名
          finalValue = value.name;
        }
        
        console.log(`[Payload] Setting input-object ${metadata.originalName} of node ${metadata.nodeId} (${targetNode.class_type}) from value:`, value, 'to finalValue:', finalValue);
        targetNode.inputs[metadata.originalName] = finalValue;
        console.log(`[Payload] Set input-object ${metadata.originalName} of node ${metadata.nodeId} (${targetNode.class_type}) to:`, finalValue);
        console.log(`[Payload] Node ${metadata.nodeId} inputs after update:`, JSON.stringify(targetNode.inputs));
      }
      } catch (err) {
        console.error(`[Payload] Error updating node ${metadata.nodeId} for path ${path}:`, err);
        throw err;
      }
    });

    // ComfyUI 官方接口: POST /prompt 接收 { prompt: <graph>, client_id? }
    // 我们按官方推荐将完整工作流作为 prompt 发送，inputs 仅作为附加调试信息返回给前端
    return {
      prompt: rawWorkflow,
      extra_data: {
        workflow_id: workflowId,
        inputs: inputsPayload,
      },
    };
  }
}

module.exports = WorkflowService;
