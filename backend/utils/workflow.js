const crypto = require('crypto');

const PARAMETER_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  IMAGE: 'image',
  MASK: 'mask',
  MODEL: 'model',
  VIDEO: 'video',
  AUDIO: 'audio',
  FILE: 'file',
  JSON: 'json',
  COLOR: 'color',
  ANY: 'any'
};

const OUTPUT_TYPE_MAP = {
  LoadImage: [{ port: 'IMAGE', type: PARAMETER_TYPES.IMAGE }],
  SaveImage: [{ port: 'images', type: PARAMETER_TYPES.IMAGE }],
  PreviewImage: [{ port: 'images', type: PARAMETER_TYPES.IMAGE }],
  KSampler: [
    { port: 'LATENT', type: 'latent' },
    { port: 'IMAGE', type: PARAMETER_TYPES.IMAGE }
  ],
  VAEDecode: [{ port: 'IMAGE', type: PARAMETER_TYPES.IMAGE }],
  LoadVideo: [{ port: 'VIDEO', type: PARAMETER_TYPES.VIDEO }],
  SaveVideo: [{ port: 'video', type: PARAMETER_TYPES.VIDEO }],
  TextOutput: [{ port: 'text', type: PARAMETER_TYPES.STRING }],
  Prompt: [{ port: 'text', type: PARAMETER_TYPES.STRING }],
  SaveText: [{ port: 'text', type: PARAMETER_TYPES.STRING }],
  Save3DModel: [{ port: 'model', type: '3d_model' }]
};

function detectInputType(port, value) {
  const lowerPort = (port || '').toLowerCase();

  if (typeof value === 'number') {
    return PARAMETER_TYPES.NUMBER;
  }
  if (typeof value === 'boolean') {
    return PARAMETER_TYPES.BOOLEAN;
  }
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return PARAMETER_TYPES.JSON;
  }

  if (lowerPort.includes('image') || lowerPort.includes('img')) {
    return PARAMETER_TYPES.IMAGE;
  }
  if (lowerPort.includes('mask')) {
    return PARAMETER_TYPES.MASK;
  }
  if (lowerPort.includes('model')) {
    return PARAMETER_TYPES.MODEL;
  }
  if (lowerPort.includes('video')) {
    return PARAMETER_TYPES.VIDEO;
  }
  if (lowerPort.includes('audio')) {
    return PARAMETER_TYPES.AUDIO;
  }
  if (lowerPort.includes('color') || lowerPort.includes('colour')) {
    return PARAMETER_TYPES.COLOR;
  }
  if (lowerPort.includes('file') || lowerPort.includes('path')) {
    return PARAMETER_TYPES.FILE;
  }

  return PARAMETER_TYPES.STRING;
}

function sanitiseKeyPart(str) {
  return (str || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildParameterKey(node, port, typeCountTracker) {
  const typeKey = sanitiseKeyPart(node.type || 'node');
  const index = (typeCountTracker[typeKey] || 0) + 1;
  typeCountTracker[typeKey] = index;
  const portKey = sanitiseKeyPart(port || 'value');
  return [typeKey, index, portKey].filter(Boolean).join('_');
}

function getNodeOutputTypes(nodeType) {
  const outputs = OUTPUT_TYPE_MAP[nodeType];
  if (outputs) {
    return outputs;
  }
  return [{ port: 'output', type: PARAMETER_TYPES.ANY }];
}

function buildParameterDefinition({ node, port, value, type, typeCountTracker }) {
  const paramKey = buildParameterKey(node, port, typeCountTracker);
  return {
    id: paramKey,
    paramKey,
    nodeId: node.id,
    nodeType: node.type,
    port,
    type,
    required: false,
    defaultValue: value === undefined ? null : value,
    friendlyName: node.title || port,
    helpText: `${node.title || node.type || '节点'} 的 ${port} 输入`,
    description: `${node.type}::${port}`
  };
}

function parseWorkflow(workflowData) {
  const mappableInputs = [];
  const mappableOutputs = [];
  const parameters = {};
  const typeCountTracker = {};

  if (!workflowData?.nodes || !Array.isArray(workflowData.nodes)) {
    throw new Error('工作流格式错误，缺少 nodes 数组');
  }

  for (const node of workflowData.nodes) {
    if (!node || typeof node !== 'object') continue;

    if (node.inputs && typeof node.inputs === 'object') {
      for (const [port, value] of Object.entries(node.inputs)) {
        const isConnection = Array.isArray(value) && value.length === 2 && value.every(v => typeof v === 'number' || typeof v === 'string');
        if (isConnection) {
          continue;
        }

        const type = detectInputType(port, value);
        const definition = buildParameterDefinition({ node, port, value, type, typeCountTracker });

        mappableInputs.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title || node.type,
          port,
          type,
          paramKey: definition.paramKey,
          required: definition.required
        });

        parameters[definition.paramKey] = definition;
      }
    }

    const outputTypes = getNodeOutputTypes(node.type || '');
    for (const output of outputTypes) {
      mappableOutputs.push({
        nodeId: node.id,
        nodeTitle: node.title || node.type,
        port: output.port,
        type: output.type
      });
    }
  }

  const outputNodes = workflowData.nodes
    .filter(node => getNodeOutputTypes(node.type || '').length > 0)
    .map(node => ({
      id: node.id,
      type: node.type,
      title: node.title || node.type,
      outputs: getNodeOutputTypes(node.type || '')
    }));

  return {
    mappableInputs,
    mappableOutputs,
    parameters,
    outputNodes
  };
}

function computeChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function applyWorkflowParameters(payload, workflowParams, workflowDefinition) {
  if (!workflowParams || !workflowDefinition?.parameters) {
    return payload;
  }

  const processed = JSON.parse(JSON.stringify(payload));
  const prompt = processed.prompt || {};

  Object.entries(workflowParams).forEach(([paramKey, value]) => {
    const definition = workflowDefinition.parameters[paramKey];
    if (!definition) {
      return;
    }

    const nodeId = definition.nodeId?.toString();
    if (!nodeId || !prompt[nodeId]) {
      return;
    }

    if (!prompt[nodeId].inputs) {
      prompt[nodeId].inputs = {};
    }

    prompt[nodeId].inputs[definition.port] = value;
  });

  processed.prompt = prompt;
  return processed;
}

module.exports = {
  PARAMETER_TYPES,
  detectInputType,
  getNodeOutputTypes,
  parseWorkflow,
  computeChecksum,
  applyWorkflowParameters
};
