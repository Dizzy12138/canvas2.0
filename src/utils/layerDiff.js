/**
 * 图层差异计算和存储工具
 * 提供图层状态变更的差异计算、存储和应用功能
 */

/**
 * 比较两个图层对象的差异
 * @param {Object} layer1 - 图层对象1
 * @param {Object} layer2 - 图层对象2
 * @returns {Object|null} 差异对象，如果没有差异则返回null
 */
export function getLayerDiff(layer1, layer2) {
  if (!layer1 && !layer2) return null;
  if (!layer1 || !layer2) return { before: layer1, after: layer2 };
  
  const diff = {};
  let hasDiff = false;
  
  // 比较基本属性
  const basicProps = ['name', 'visible', 'locked', 'opacity', 'blendMode', 'parentId'];
  basicProps.forEach(prop => {
    if (layer1[prop] !== layer2[prop]) {
      diff[prop] = { before: layer1[prop], after: layer2[prop] };
      hasDiff = true;
    }
  });
  
  // 比较效果数组
  if (JSON.stringify(layer1.effects || []) !== JSON.stringify(layer2.effects || [])) {
    diff.effects = { 
      before: JSON.parse(JSON.stringify(layer1.effects || [])), 
      after: JSON.parse(JSON.stringify(layer2.effects || [])) 
    };
    hasDiff = true;
  }
  
  // 比较对象数组
  if (JSON.stringify(layer1.objects || []) !== JSON.stringify(layer2.objects || [])) {
    diff.objects = { 
      before: JSON.parse(JSON.stringify(layer1.objects || [])), 
      after: JSON.parse(JSON.stringify(layer2.objects || [])) 
    };
    hasDiff = true;
  }
  
  return hasDiff ? diff : null;
}

/**
 * 比较两个图层数组的差异
 * @param {Array} layers1 - 图层数组1
 * @param {Array} layers2 - 图层数组2
 * @returns {Object} 差异对象
 */
export function getLayersDiff(layers1, layers2) {
  const diff = {
    added: [],
    removed: [],
    modified: []
  };
  
  // 转换为以ID为键的对象映射
  const layers1Map = (layers1 || []).reduce((map, layer) => {
    map[layer.id] = layer;
    return map;
  }, {});
  
  const layers2Map = (layers2 || []).reduce((map, layer) => {
    map[layer.id] = layer;
    return map;
  }, {});
  
  // 找出新增的图层
  Object.keys(layers2Map).forEach(id => {
    if (!layers1Map[id]) {
      diff.added.push(layers2Map[id]);
    }
  });
  
  // 找出删除的图层
  Object.keys(layers1Map).forEach(id => {
    if (!layers2Map[id]) {
      diff.removed.push(layers1Map[id]);
    }
  });
  
  // 找出修改的图层
  Object.keys(layers1Map).forEach(id => {
    if (layers2Map[id]) {
      const layerDiff = getLayerDiff(layers1Map[id], layers2Map[id]);
      if (layerDiff) {
        diff.modified.push({
          id: id,
          ...layerDiff
        });
      }
    }
  });
  
  return diff;
}

/**
 * 比较两个蒙版对象的差异
 * @param {Object} mask1 - 蒙版对象1
 * @param {Object} mask2 - 蒙版对象2
 * @returns {Object|null} 差异对象，如果没有差异则返回null
 */
export function getMaskDiff(mask1, mask2) {
  if (!mask1 && !mask2) return null;
  if (!mask1 || !mask2) return { before: mask1, after: mask2 };
  
  const diff = {};
  let hasDiff = false;
  
  // 比较基本属性
  const basicProps = ['type', 'inverted', 'density', 'feather'];
  basicProps.forEach(prop => {
    if (mask1[prop] !== mask2[prop]) {
      diff[prop] = { before: mask1[prop], after: mask2[prop] };
      hasDiff = true;
    }
  });
  
  // 比较边界
  if (JSON.stringify(mask1.bounds || {}) !== JSON.stringify(mask2.bounds || {})) {
    diff.bounds = { 
      before: JSON.parse(JSON.stringify(mask1.bounds || {})), 
      after: JSON.parse(JSON.stringify(mask2.bounds || {})) 
    };
    hasDiff = true;
  }
  
  return hasDiff ? diff : null;
}

/**
 * 比较两个蒙版数组的差异
 * @param {Array} masks1 - 蒙版数组1
 * @param {Array} masks2 - 蒙版数组2
 * @returns {Object} 差异对象
 */
export function getMasksDiff(masks1, masks2) {
  const diff = {
    added: [],
    removed: [],
    modified: []
  };
  
  // 转换为以ID为键的对象映射
  const masks1Map = (masks1 || []).reduce((map, mask) => {
    map[mask.id] = mask;
    return map;
  }, {});
  
  const masks2Map = (masks2 || []).reduce((map, mask) => {
    map[mask.id] = mask;
    return map;
  }, {});
  
  // 找出新增的蒙版
  Object.keys(masks2Map).forEach(id => {
    if (!masks1Map[id]) {
      diff.added.push(masks2Map[id]);
    }
  });
  
  // 找出删除的蒙版
  Object.keys(masks1Map).forEach(id => {
    if (!masks2Map[id]) {
      diff.removed.push(masks1Map[id]);
    }
  });
  
  // 找出修改的蒙版
  Object.keys(masks1Map).forEach(id => {
    if (masks2Map[id]) {
      const maskDiff = getMaskDiff(masks1Map[id], masks2Map[id]);
      if (maskDiff) {
        diff.modified.push({
          id: id,
          ...maskDiff
        });
      }
    }
  });
  
  return diff;
}

/**
 * 比较两个图层状态的完整差异
 * @param {Object} state1 - 状态对象1
 * @param {Object} state2 - 状态对象2
 * @returns {Object} 完整差异对象
 */
export function getCompleteDiff(state1, state2) {
  const diff = {};
  
  // 比较图层
  const layersDiff = getLayersDiff(state1.layers, state2.layers);
  if (layersDiff.added.length > 0 || 
      layersDiff.removed.length > 0 || 
      layersDiff.modified.length > 0) {
    diff.layers = layersDiff;
  }
  
  // 比较蒙版
  const masksDiff = getMasksDiff(state1.masks, state2.masks);
  if (masksDiff.added.length > 0 || 
      masksDiff.removed.length > 0 || 
      masksDiff.modified.length > 0) {
    diff.masks = masksDiff;
  }
  
  // 比较图层组
  if (state1.layerGroups && state2.layerGroups) {
    if (JSON.stringify(state1.layerGroups) !== JSON.stringify(state2.layerGroups)) {
      diff.layerGroups = {
        before: JSON.parse(JSON.stringify(state1.layerGroups)),
        after: JSON.parse(JSON.stringify(state2.layerGroups))
      };
    }
  }
  
  return diff;
}

/**
 * 应用差异到图层状态
 * @param {Object} state - 当前状态
 * @param {Object} diff - 差异对象
 * @returns {Object} 应用差异后的新状态
 */
export function applyDiff(state, diff) {
  const newState = JSON.parse(JSON.stringify(state));
  
  // 应用图层差异
  if (diff.layers) {
    // 处理新增的图层
    if (diff.layers.added) {
      newState.layers = [...newState.layers, ...diff.layers.added];
    }
    
    // 处理删除的图层
    if (diff.layers.removed) {
      const removedIds = diff.layers.removed.map(layer => layer.id);
      newState.layers = newState.layers.filter(layer => !removedIds.includes(layer.id));
    }
    
    // 处理修改的图层
    if (diff.layers.modified) {
      diff.layers.modified.forEach(modifiedLayer => {
        const index = newState.layers.findIndex(layer => layer.id === modifiedLayer.id);
        if (index !== -1) {
          // 只更新被修改的属性
          Object.keys(modifiedLayer).forEach(key => {
            if (key !== 'id') {
              newState.layers[index][key] = modifiedLayer[key].after;
            }
          });
        }
      });
    }
  }
  
  // 应用蒙版差异
  if (diff.masks) {
    // 处理新增的蒙版
    if (diff.masks.added) {
      newState.masks = [...newState.masks, ...diff.masks.added];
    }
    
    // 处理删除的蒙版
    if (diff.masks.removed) {
      const removedIds = diff.masks.removed.map(mask => mask.id);
      newState.masks = newState.masks.filter(mask => !removedIds.includes(mask.id));
    }
    
    // 处理修改的蒙版
    if (diff.masks.modified) {
      diff.masks.modified.forEach(modifiedMask => {
        const index = newState.masks.findIndex(mask => mask.id === modifiedMask.id);
        if (index !== -1) {
          // 只更新被修改的属性
          Object.keys(modifiedMask).forEach(key => {
            if (key !== 'id') {
              newState.masks[index][key] = modifiedMask[key].after;
            }
          });
        }
      });
    }
  }
  
  // 应用图层组差异
  if (diff.layerGroups) {
    newState.layerGroups = diff.layerGroups.after;
  }
  
  return newState;
}

/**
 * 压缩差异对象以减少存储空间
 * @param {Object} diff - 差异对象
 * @returns {Object} 压缩后的差异对象
 */
export function compressDiff(diff) {
  // 简单的压缩实现，实际项目中可以使用更复杂的压缩算法
  return JSON.parse(JSON.stringify(diff));
}

/**
 * 解压差异对象
 * @param {Object} compressedDiff - 压缩的差异对象
 * @returns {Object} 解压后的差异对象
 */
export function decompressDiff(compressedDiff) {
  // 简单的解压实现，实际项目中可以使用更复杂的解压算法
  return JSON.parse(JSON.stringify(compressedDiff));
}

export default {
  getLayerDiff,
  getLayersDiff,
  getMaskDiff,
  getMasksDiff,
  getCompleteDiff,
  applyDiff,
  compressDiff,
  decompressDiff
};