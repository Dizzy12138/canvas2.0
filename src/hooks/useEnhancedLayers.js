import { useState, useCallback, useMemo } from 'react';

// 图层混合模式枚举
export const BlendMode = {
  NORMAL: 'normal',
  MULTIPLY: 'multiply',
  SCREEN: 'screen',
  OVERLAY: 'overlay',
  DARKEN: 'darken',
  LIGHTEN: 'lighten',
  COLOR_DODGE: 'color-dodge',
  COLOR_BURN: 'color-burn',
  HARD_LIGHT: 'hard-light',
  SOFT_LIGHT: 'soft-light',
  DIFFERENCE: 'difference',
  EXCLUSION: 'exclusion',
  HUE: 'hue',
  SATURATION: 'saturation',
  COLOR: 'color',
  LUMINOSITY: 'luminosity'
};

// 图层效果类型枚举
export const LayerEffectType = {
  BLUR: 'blur',
  BRIGHTNESS: 'brightness',
  CONTRAST: 'contrast',
  HUE: 'hue',
  SATURATION: 'saturation',
  SHADOW: 'shadow',
  GLOW: 'glow'
};

export function useEnhancedLayers(initialLayers = []) {
  const [layers, setLayers] = useState(initialLayers);
  const [activeLayerId, setActiveLayerId] = useState(
    initialLayers.length > 0 ? initialLayers[0].id : null
  );
  const [layerGroups, setLayerGroups] = useState([]); // 图层组
  const [masks, setMasks] = useState([]); // 蒙版数据

  const activeLayer = useMemo(
    () => layers.find(layer => layer.id === activeLayerId) || null,
    [layers, activeLayerId]
  );

  // 创建新图层
  const addLayer = useCallback((layerData = {}) => {
    const newLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: layerData.name || `图层 ${layers.length + 1}`,
      visible: layerData.visible !== undefined ? layerData.visible : true,
      locked: layerData.locked || false,
      opacity: layerData.opacity !== undefined ? layerData.opacity : 1,
      blendMode: layerData.blendMode || BlendMode.NORMAL,
      orderIndex: layers.length,
      effects: layerData.effects || [],
      objects: layerData.objects || [],
      thumbnail: layerData.thumbnail || null,
      parentId: layerData.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    return newLayer;
  }, [layers.length]);

  // 删除图层
  const deleteLayer = useCallback((layerId) => {
    if (layers.length <= 1) return;
    
    // 删除关联的蒙版
    setMasks(prev => prev.filter(mask => mask.layerId !== layerId));
    
    // 删除图层
    const newLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(newLayers);
    
    // 如果删除的是当前激活图层，切换到下一个图层
    if (activeLayerId === layerId) {
      const nextActiveLayer = newLayers[newLayers.length - 1];
      setActiveLayerId(nextActiveLayer ? nextActiveLayer.id : null);
    }
  }, [layers, activeLayerId]);

  // 切换图层可见性
  const toggleLayerVisibility = useCallback((layerId) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible, updatedAt: new Date() } : layer
      )
    );
  }, []);

  // 切换图层锁定状态
  const toggleLayerLock = useCallback((layerId) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, locked: !layer.locked, updatedAt: new Date() } : layer
      )
    );
  }, []);

  // 更新图层属性
  const updateLayer = useCallback((layerId, updater) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, ...updater(layer), updatedAt: new Date() } : layer
      )
    );
  }, []);

  // 重命名图层
  const renameLayer = useCallback((layerId, newName) => {
    updateLayer(layerId, () => ({ name: newName }));
  }, [updateLayer]);

  // 调整图层不透明度
  const setLayerOpacity = useCallback((layerId, opacity) => {
    updateLayer(layerId, () => ({ opacity: Math.max(0, Math.min(1, opacity)) }));
  }, [updateLayer]);

  // 设置图层混合模式
  const setLayerBlendMode = useCallback((layerId, blendMode) => {
    updateLayer(layerId, () => ({ blendMode }));
  }, [updateLayer]);

  // 调整图层顺序
  const reorderLayer = useCallback((layerId, newIndex) => {
    const currentIndex = layers.findIndex(layer => layer.id === layerId);
    if (currentIndex === -1 || currentIndex === newIndex) return;
    
    const newLayers = [...layers];
    const [movedLayer] = newLayers.splice(currentIndex, 1);
    newLayers.splice(newIndex, 0, movedLayer);
    
    // 更新所有图层的orderIndex
    const updatedLayers = newLayers.map((layer, index) => ({
      ...layer,
      orderIndex: index
    }));
    
    setLayers(updatedLayers);
  }, [layers]);

  // 创建图层组
  const createLayerGroup = useCallback((name, layerIds = []) => {
    const newGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name || `图层组 ${layerGroups.length + 1}`,
      layerIds: layerIds,
      collapsed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setLayerGroups(prev => [...prev, newGroup]);
    
    // 更新组内图层的parentId
    if (layerIds.length > 0) {
      setLayers(prev => 
        prev.map(layer => 
          layerIds.includes(layer.id) 
            ? { ...layer, parentId: newGroup.id, updatedAt: new Date() } 
            : layer
        )
      );
    }
    
    return newGroup;
  }, [layerGroups.length]);

  // 删除图层组
  const deleteLayerGroup = useCallback((groupId) => {
    setLayerGroups(prev => prev.filter(group => group.id !== groupId));
    
    // 清除组内图层的parentId
    setLayers(prev => 
      prev.map(layer => 
        layer.parentId === groupId 
          ? { ...layer, parentId: null, updatedAt: new Date() } 
          : layer
      )
    );
  }, []);

  // 重命名图层组
  const renameLayerGroup = useCallback((groupId, newName) => {
    setLayerGroups(prev =>
      prev.map(group =>
        group.id === groupId ? { ...group, name: newName, updatedAt: new Date() } : group
      )
    );
  }, []);

  // 为图层创建蒙版
  const createMaskForLayer = useCallback((layerId, maskData = {}) => {
    const newMask = {
      id: `mask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      layerId: layerId,
      type: maskData.type || 'alpha',
      data: maskData.data || null,
      bounds: maskData.bounds || { x: 0, y: 0, width: 100, height: 100 },
      inverted: maskData.inverted || false,
      density: maskData.density !== undefined ? maskData.density : 1,
      feather: maskData.feather || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setMasks(prev => [...prev, newMask]);
    
    // 更新图层关联的蒙版ID
    updateLayer(layerId, () => ({ maskId: newMask.id }));
    
    return newMask;
  }, [updateLayer]);

  // 更新蒙版
  const updateMask = useCallback((maskId, updates) => {
    setMasks(prev =>
      prev.map(mask =>
        mask.id === maskId ? { ...mask, ...updates, updatedAt: new Date() } : mask
      )
    );
  }, []);

  // 删除蒙版
  const deleteMask = useCallback((maskId) => {
    const mask = masks.find(m => m.id === maskId);
    if (!mask) return;
    
    setMasks(prev => prev.filter(m => m.id !== maskId));
    
    // 清除图层关联的蒙版ID
    updateLayer(mask.layerId, () => ({ maskId: null }));
  }, [masks, updateLayer]);

  // 为图层添加效果
  const addLayerEffect = useCallback((layerId, effectData) => {
    const newEffect = {
      id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: effectData.type,
      parameters: effectData.parameters || {},
      enabled: effectData.enabled !== undefined ? effectData.enabled : true
    };
    
    updateLayer(layerId, (layer) => ({
      effects: [...(layer.effects || []), newEffect]
    }));
    
    return newEffect;
  }, [updateLayer]);

  // 更新图层效果
  const updateLayerEffect = useCallback((layerId, effectId, updates) => {
    updateLayer(layerId, (layer) => ({
      effects: (layer.effects || []).map(effect =>
        effect.id === effectId ? { ...effect, ...updates } : effect
      )
    }));
  }, [updateLayer]);

  // 删除图层效果
  const deleteLayerEffect = useCallback((layerId, effectId) => {
    updateLayer(layerId, (layer) => ({
      effects: (layer.effects || []).filter(effect => effect.id !== effectId)
    }));
  }, [updateLayer]);

  // 合并图层
  const mergeLayers = useCallback((sourceLayerId, targetLayerId) => {
    // 获取源图层和目标图层
    const sourceLayer = layers.find(layer => layer.id === sourceLayerId);
    const targetLayer = layers.find(layer => layer.id === targetLayerId);
    
    if (!sourceLayer || !targetLayer) return null;
    
    // 合并图层对象
    const mergedObjects = [...(targetLayer.objects || []), ...(sourceLayer.objects || [])];
    
    // 更新目标图层
    updateLayer(targetLayerId, (layer) => ({
      objects: mergedObjects,
      name: `${targetLayer.name} + ${sourceLayer.name}`,
      updatedAt: new Date()
    }));
    
    // 删除源图层
    deleteLayer(sourceLayerId);
    
    return targetLayerId;
  }, [layers, updateLayer, deleteLayer]);

  // 复制图层
  const duplicateLayer = useCallback((layerId) => {
    const sourceLayer = layers.find(layer => layer.id === layerId);
    if (!sourceLayer) return null;
    
    const duplicatedLayer = {
      ...sourceLayer,
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${sourceLayer.name} 副本`,
      orderIndex: layers.length,
      objects: [...(sourceLayer.objects || [])], // 浅拷贝对象数组
      effects: [...(sourceLayer.effects || [])], // 浅拷贝效果数组
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setLayers(prev => [...prev, duplicatedLayer]);
    setActiveLayerId(duplicatedLayer.id);
    
    // 如果原图层有蒙版，也复制蒙版
    const sourceMask = masks.find(mask => mask.layerId === layerId);
    if (sourceMask) {
      const duplicatedMask = {
        ...sourceMask,
        id: `mask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        layerId: duplicatedLayer.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      setMasks(prev => [...prev, duplicatedMask]);
      updateLayer(duplicatedLayer.id, () => ({ maskId: duplicatedMask.id }));
    }
    
    return duplicatedLayer;
  }, [layers, masks, updateLayer]);

  // 批量合并图层
  const mergeMultipleLayers = useCallback((targetLayerId, sourceLayerIds) => {
    // 获取目标图层
    const targetLayer = layers.find(layer => layer.id === targetLayerId);
    if (!targetLayer) return null;
    
    // 获取所有源图层
    const sourceLayers = layers.filter(layer => 
      sourceLayerIds.includes(layer.id) && layer.id !== targetLayerId
    );
    
    if (sourceLayers.length === 0) return null;
    
    // 合并所有源图层的对象到目标图层
    let allObjects = [...(targetLayer.objects || [])];
    let layerNames = [targetLayer.name];
    
    sourceLayers.forEach(sourceLayer => {
      allObjects = [...allObjects, ...(sourceLayer.objects || [])];
      layerNames.push(sourceLayer.name);
    });
    
    // 更新目标图层
    updateLayer(targetLayerId, (layer) => ({
      objects: allObjects,
      name: `${targetLayer.name} + ${sourceLayers.length}个图层`,
      updatedAt: new Date()
    }));
    
    // 删除源图层
    sourceLayerIds
      .filter(id => id !== targetLayerId)
      .forEach(sourceLayerId => {
        deleteLayer(sourceLayerId);
      });
    
    return targetLayerId;
  }, [layers, updateLayer, deleteLayer]);

  // 拆分图层
  const splitLayer = useCallback((layerId, splitCriteria) => {
    const sourceLayer = layers.find(layer => layer.id === layerId);
    if (!sourceLayer) return [];
    
    // 根据拆分条件创建新图层
    const newLayers = [];
    
    // 简单实现：将对象按类型拆分到不同图层
    if (sourceLayer.objects && sourceLayer.objects.length > 0) {
      // 按对象类型分组
      const objectGroups = {};
      sourceLayer.objects.forEach(obj => {
        const type = obj.type || 'unknown';
        if (!objectGroups[type]) {
          objectGroups[type] = [];
        }
        objectGroups[type].push(obj);
      });
      
      // 为每个类型创建新图层
      Object.keys(objectGroups).forEach((type, index) => {
        const newLayer = {
          ...sourceLayer,
          id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
          name: `${sourceLayer.name}_${type}`,
          objects: objectGroups[type],
          orderIndex: layers.length + index,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        newLayers.push(newLayer);
      });
    }
    
    // 如果没有对象或拆分失败，创建一个副本
    if (newLayers.length === 0) {
      const duplicatedLayer = {
        ...sourceLayer,
        id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${sourceLayer.name} 副本`,
        orderIndex: layers.length,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      newLayers.push(duplicatedLayer);
    }
    
    // 添加新图层到状态
    setLayers(prev => [...prev, ...newLayers]);
    
    // 删除原图层
    deleteLayer(layerId);
    
    return newLayers.map(layer => layer.id);
  }, [layers, deleteLayer]);

  // 克隆图层
  const cloneLayer = useCallback((layerId) => {
    return duplicateLayer(layerId);
  }, [duplicateLayer]);

  // 跨图层融合
  const fuseLayers = useCallback((sourceLayerId, targetLayerId, mode = 'blend', strength = 0.5) => {
    // 获取源图层和目标图层
    const sourceLayer = layers.find(layer => layer.id === sourceLayerId);
    const targetLayer = layers.find(layer => layer.id === targetLayerId);
    
    if (!sourceLayer || !targetLayer) return null;
    
    // 根据融合模式处理
    switch (mode) {
      case 'blend':
        // 混合模式：将源图层对象添加到目标图层，并调整不透明度
        updateLayer(targetLayerId, (layer) => ({
          objects: [...(layer.objects || []), ...(sourceLayer.objects || [])],
          opacity: Math.min(1, layer.opacity + (sourceLayer.opacity * strength)),
          updatedAt: new Date()
        }));
        break;
        
      case 'replace':
        // 替换模式：用源图层替换目标图层的内容
        updateLayer(targetLayerId, (layer) => ({
          objects: [...(sourceLayer.objects || [])],
          name: `${sourceLayer.name}`,
          updatedAt: new Date()
        }));
        break;
        
      case 'add':
        // 叠加模式：将源图层对象添加到目标图层
        updateLayer(targetLayerId, (layer) => ({
          objects: [...(layer.objects || []), ...(sourceLayer.objects || [])],
          name: `${layer.name} + ${sourceLayer.name}`,
          updatedAt: new Date()
        }));
        break;
        
      default:
        break;
    }
    
    return targetLayerId;
  }, [layers, updateLayer]);

  return {
    // 图层状态
    layers,
    activeLayerId,
    activeLayer,
    layerGroups,
    masks,
    
    // 图层操作
    setLayers,
    setActiveLayerId,
    addLayer,
    deleteLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayer,
    renameLayer,
    setLayerOpacity,
    setLayerBlendMode,
    reorderLayer,
    
    // 图层组操作
    createLayerGroup,
    deleteLayerGroup,
    renameLayerGroup,
    
    // 蒙版操作
    createMaskForLayer,
    updateMask,
    deleteMask,
    
    // 效果操作
    addLayerEffect,
    updateLayerEffect,
    deleteLayerEffect,
    
    // 高级操作
    mergeLayers,
    mergeMultipleLayers,
    splitLayer,
    duplicateLayer,
    cloneLayer,
    fuseLayers
  };
}