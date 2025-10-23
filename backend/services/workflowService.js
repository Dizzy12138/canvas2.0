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

const inferType = (typeHint, value) => {
  const hint = (typeHint || '').toString().toLowerCase();
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
    return 'string';
  }
  if (hint.includes('model')) {
    return 'model';
  }
  if (hint.includes('latent')) {
    return 'latent';
  }

  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';

  return 'string';
};

const asNodeArray = (jsonContent) => {
  if (!jsonContent) return [];
  if (Array.isArray(jsonContent.nodes)) {
    return jsonContent.nodes;
  }
  if (jsonContent.nodes && typeof jsonContent.nodes === 'object') {
    return Object.values(jsonContent.nodes);
  }
  return [];
};

const cloneWorkflow = (workflow) => {
  if (!workflow) return {};
  return JSON.parse(JSON.stringify(workflow));
};

const findNodeById = (workflow, nodeId) => {
  if (!workflow || !workflow.nodes) return null;
  if (Array.isArray(workflow.nodes)) {
    return workflow.nodes.find((node) => Number(node?.id) === Number(nodeId));
  }
  return (
    workflow.nodes[nodeId] ||
    workflow.nodes[String(nodeId)] ||
    null
  );
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
          const hasLink = input.link !== undefined && input.link !== null;
          const hasLinksArray = Array.isArray(input.links) && input.links.length > 0;
          const defaultValue = input.value ?? input.default ?? null;
          if ((hasLink || hasLinksArray) && defaultValue === null) {
            return; // 已连接到其他节点且无默认值，不暴露
          }

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

    return {
      workflow_id: workflowId,
      nodes,
      parameterLookup,
    };
  }

  static getWorkflowAsCascader(workflowData) {
    if (!workflowData || !workflowData.nodes) {
      return [];
    }

    return workflowData.nodes
      .filter((node) => Array.isArray(node.inputs) && node.inputs.length > 0)
      .map((node) => ({
        label: node.name,
        value: node.key,
        children: node.inputs.map((input) => ({
          label: input.label || input.key,
          value: input.path,
          type: input.type,
          default: input.default,
          nodeId: node.id,
          nodeKey: node.key,
        })),
      }));
  }

  static constructExecutionPayload(appBindings, uiInputs, workflowFile) {
    if (!workflowFile) {
      throw new Error('workflowFile is required to construct payload');
    }

    const rawWorkflow = cloneWorkflow(workflowFile.rawWorkflow);
    const workflowId = workflowFile.workflowId || workflowFile.workflow_id || uuidv4();
    const parameters = workflowFile.parameters || workflowFile.parameterLookup || {};
    const bindings = normaliseBindings(appBindings);

    const valuesByPath = {};

    if (uiInputs && typeof uiInputs === 'object') {
      Object.entries(uiInputs).forEach(([key, value]) => {
        valuesByPath[key] = value;
      });
    }

    bindings.forEach(({ componentId, bindTo }) => {
      if (!bindTo) return;
      if (Object.prototype.hasOwnProperty.call(uiInputs || {}, componentId)) {
        valuesByPath[bindTo] = uiInputs[componentId];
      }
    });

    const inputsPayload = {};

    Object.entries(valuesByPath).forEach(([path, value]) => {
      const metadata = parameters[path];
      if (!metadata) {
        return;
      }

      inputsPayload[path] = value;
      const targetNode = metadata.nodeId != null
        ? findNodeById(rawWorkflow, metadata.nodeId)
        : null;

      if (!targetNode) {
        return;
      }

      if (metadata.source === 'widget' && Number.isInteger(metadata.widgetIndex)) {
        if (!Array.isArray(targetNode.widgets_values)) {
          targetNode.widgets_values = [];
        }
        targetNode.widgets_values[metadata.widgetIndex] = value;
      } else if (metadata.source === 'input' && Number.isInteger(metadata.inputIndex)) {
        if (Array.isArray(targetNode.inputs)) {
          const targetInput = targetNode.inputs[metadata.inputIndex];
          if (targetInput) {
            delete targetInput.link;
            targetInput.value = value;
          }
        }
      } else if (metadata.source === 'input-object' && metadata.originalName) {
        if (!targetNode.inputs || Array.isArray(targetNode.inputs)) {
          targetNode.inputs = targetNode.inputs && !Array.isArray(targetNode.inputs)
            ? targetNode.inputs
            : {};
        }
        targetNode.inputs[metadata.originalName] = value;
      }
    });

    return {
      workflow_id: workflowId,
      inputs: inputsPayload,
      workflow: rawWorkflow,
    };
  }
}

module.exports = WorkflowService;
