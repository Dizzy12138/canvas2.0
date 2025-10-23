const { WorkflowFile } = require('../models');
const { v4: uuidv4 } = require('uuid');

class WorkflowService {

    /**
     * 解析 ComfyUI 工作流 JSON 文件，生成标准化节点参数树。
     * @param {object} jsonContent - ComfyUI 工作流的 JSON 内容。
     * @returns {object} - 包含 workflow_id 和标准化节点信息的对象。
     */
    static parseWorkflow(jsonContent) {
        if (!jsonContent || !jsonContent.nodes) {
            throw new Error('Invalid ComfyUI workflow JSON format.');
        }

        const workflowId = uuidv4(); // 为每个工作流生成唯一ID
        const nodes = [];

        // 遍历 ComfyUI 的节点，提取所需信息
        for (const nodeId in jsonContent.nodes) {
            const node = jsonContent.nodes[nodeId];
            const inputs = [];
            const outputs = [];

            // 提取输入参数
            if (node.inputs) {
                for (const input of node.inputs) {
                    // 尝试从 ComfyUI 节点结构中提取类型和默认值
                    // 这里的逻辑可能需要根据实际的 ComfyUI JSON 结构进行调整和完善
                    // 假设输入参数的类型和默认值可以在这里直接获取或推断
                    inputs.push({
                        key: input.name,
                        type: input.type || 'string', // 默认string，实际应更精确推断
                        default: input.default || null // 尝试获取默认值
                    });
                }
            }
            
            // 提取输出参数
            if (node.outputs) {
                for (const output of node.outputs) {
                    outputs.push({
                        key: output.name,
                        type: output.type || 'string' // 默认string
                    });
                }
            }

            nodes.push({
                id: parseInt(nodeId), // ComfyUI 的节点ID通常是数字字符串
                name: node.type, // 使用 ComfyUI 的节点类型作为名称
                type: node.class_type || 'unknown', // 节点的类类型
                inputs: inputs,
                outputs: outputs
            });
        }

        return {
            workflow_id: workflowId,
            nodes: nodes
        };
    }

    /**
     * 根据解析后的工作流数据，生成前端所需的树形下拉选择器（Cascader）数据结构。
     * @param {object} workflowData - parseWorkflow 返回的标准化工作流数据。
     * @returns {Array<object>} - Cascader 格式的数据数组。
     */
    static getWorkflowAsCascader(workflowData) {
        if (!workflowData || !workflowData.nodes) {
            return [];
        }

        const cascaderData = [];
        for (const node of workflowData.nodes) {
            const children = [];
            for (const input of node.inputs) {
                children.push({
                    label: input.key,
                    value: `${node.name}.${input.key}`,
                    type: input.type,
                    default: input.default
                });
            }
            // 也可以考虑将输出参数添加到可绑定项，如果业务需要的话
            // for (const output of node.outputs) {
            //     children.push({
            //         label: output.key,
            //         value: `${node.name}.${output.key}`,
            //         type: output.type
            //     });
            // }

            if (children.length > 0) {
                cascaderData.push({
                    label: node.name,
                    value: node.name,
                    children: children
                });
            }
        }
        return cascaderData;
    }

    /**
     * 根据前端 UI 绑定和用户输入，构建 ComfyUI 执行所需的 payload。
     * @param {Array<object>} uiBindings - 前端 UI 组件与工作流参数的绑定关系，例如：`[{ component_id: 'slider_cfg', bind_to: 'KSampler.cfg' }]`。
     * @param {object} formInputs - 前端用户输入值，例如：`{ slider_cfg: 8.0, input_prompt: 'a cat' }`。
     * @param {object} originalWorkflowJson - 原始的 ComfyUI 工作流 JSON。
     * @returns {object} - 动态构造的 ComfyUI payload。
     */
    static constructExecutionPayload(uiBindings, formInputs, originalWorkflowJson) {
        if (!originalWorkflowJson || !originalWorkflowJson.nodes) {
            throw new Error('Original ComfyUI workflow JSON is required.');
        }

        const payload = { ...originalWorkflowJson }; // 复制原始工作流以进行修改
        payload.inputs = {}; // 用于存储前端注入的参数

        for (const binding of uiBindings) {
            const { component_id, bind_to } = binding;
            const inputValue = formInputs[component_id];

            if (inputValue !== undefined) {
                // bind_to 格式为 'NodeName.ParamKey'
                const [nodeName, paramKey] = bind_to.split('.');

                // 查找原始工作流中的对应节点和参数，并注入值
                // 注意：ComfyUI 的节点ID是数字字符串，这里需要根据nodeName找到对应的nodeId
                // 这是一个简化的查找逻辑，可能需要更健壮的映射机制
                let targetNodeId = null;
                for (const id in originalWorkflowJson.nodes) {
                    if (originalWorkflowJson.nodes[id].type === nodeName) {
                        targetNodeId = id;
                        break;
                    }
                }

                if (targetNodeId) {
                    const node = payload.nodes[targetNodeId];
                    if (node && node.inputs) {
                        for (let i = 0; i < node.inputs.length; i++) {
                            if (node.inputs[i].name === paramKey) {
                                // 假设 ComfyUI 的输入是数组形式，直接替换值
                                // 实际情况可能更复杂，例如某些输入是连接到其他节点，某些是直接值
                                // 这里需要根据 ComfyUI 的实际 API 结构进行精确适配
                                node.inputs[i].value = inputValue;
                                break;
                            }
                        }
                    }
                }
                payload.inputs[bind_to] = inputValue; // 记录注入的参数，用于调试或验证
            }
        }

        // 最终返回的 payload 应该是一个符合 ComfyUI API 要求的完整工作流对象
        // 这里的实现是直接修改了原始工作流 JSON 的副本，并添加了一个inputs字段用于记录
        // 实际调用 ComfyUI API 时，可能需要将这个修改后的 payload 发送过去
        return payload;
    }
}

module.exports = WorkflowService;
