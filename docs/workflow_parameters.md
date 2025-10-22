# 工作流参数自定义指南

本文档说明如何在自定义的ComfyUI工作流JSON中定义参数，使其能够在右侧编辑栏中显示并供用户调整。

## 参数定义结构

在工作流JSON中，通过`parameters`字段定义可编辑参数：

```json
{
  "name": "工作流名称",
  "description": "工作流描述",
  "parameters": {
    "参数名": {
      "type": "参数类型",
      "label": "显示标签",
      "default": "默认值",
      "description": "参数描述"
      }
    }
  }
}
```

## 支持的参数类型

### 1. 数值型参数 (number/integer)

```json
{
  "参数名": {
    "type": "number", // 或 "integer"
    "label": "参数标签",
    "min": 0,         // 最小值
    "max": 100,       // 最大值
    "step": 0.1,      // 步长 (仅number类型)
    "default": 50,    // 默认值
    "description": "参数描述"
  }
}
```

如果定义了`min`和`max`，将显示滑块控件；否则显示数字输入框。

### 2. 枚举型参数 (string with options)

```json
{
  "参数名": {
    "type": "string",
    "label": "参数标签",
    "options": ["选项1", "选项2", "选项3"],
    "default": "选项1",
    "description": "参数描述"
  }
}
```

显示为下拉选择框。

### 3. 布尔型参数 (boolean)

```json
{
  "参数名": {
    "type": "boolean",
    "label": "参数标签",
    "default": false,
    "description": "参数描述"
  }
}
```

显示为复选框。

### 4. 文本型参数 (string)

```json
{
  "参数名": {
    "type": "string",
    "label": "参数标签",
    "default": "默认文本",
    "description": "参数描述"
  }
}
```

显示为文本输入框。

## 条件参数

可以通过`condition`字段定义参数的显示条件：

```json
{
  "参数名1": {
    "type": "boolean",
    "label": "启用高级选项",
    "default": false
  },
  "参数名2": {
    "type": "number",
    "label": "高级参数",
    "min": 0,
    "max": 100,
    "default": 50,
    "condition": {
      "param": "参数名1",
      "value": true
    }
  }
}
```

### 支持的条件操作符

- `==` (默认): 等于
- `!=`: 不等于
- `>`: 大于
- `<`: 小于
- `>=`: 大于等于
- `<=`: 小于等于
- `in`: 在数组中
- `not_in`: 不在数组中

```json
{
  "参数名": {
    "type": "number",
    "label": "条件参数",
    "min": 0,
    "max": 100,
    "default": 50,
    "condition": {
      "param": "其他参数名",
      "value": 10,
      "operator": ">" // 当其他参数名的值大于10时显示此参数
    }
  }
}
```

## 示例工作流

### 基础示例

```json
{
  "name": "基础文生图工作流",
  "description": "支持基本参数调节的文生图工作流",
  "parameters": {
    "cfg": {
      "type": "number",
      "label": "CFG Scale",
      "min": 1,
      "max": 30,
      "default": 7.5,
      "description": "提示词引导强度"
    },
    "steps": {
      "type": "integer",
      "label": "生成步数",
      "min": 10,
      "max": 150,
      "default": 20,
      "description": "图像生成步数"
    }
  }
}
```

### 高级示例

```json
{
  "name": "高级工作流",
  "description": "支持条件参数的高级工作流",
  "parameters": {
    "enable_hr": {
      "type": "boolean",
      "label": "启用高清修复",
      "default": false
    },
    "hr_scale": {
      "type": "number",
      "label": "高清修复倍数",
      "min": 1,
      "max": 4,
      "step": 0.1,
      "default": 2,
      "condition": {
        "param": "enable_hr",
        "value": true
      }
    }
  }
}
```

## 最佳实践

1. **参数命名**: 使用清晰、有意义的参数名
2. **默认值**: 为所有参数设置合理的默认值
3. **范围限制**: 为数值型参数设置合适的min/max范围
4. **描述信息**: 为复杂参数添加详细描述
5. **条件逻辑**: 合理使用条件参数，避免界面过于复杂
6. **选项排序**: 为枚举型参数按逻辑顺序排列选项

通过以上方式定义的工作流参数将自动在右侧编辑栏中显示，用户可以实时调整这些参数来控制AI生成过程。