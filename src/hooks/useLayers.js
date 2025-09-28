import { useState, useCallback, useMemo } from 'react';

export function useLayers(initialLayers = []) {
  const [layers, setLayers] = useState(initialLayers);
  const [activeLayerId, setActiveLayerId] = useState(
    initialLayers.length > 0 ? initialLayers[0].id : null
  );

  const activeLayer = useMemo(
    () => layers.find(layer => layer.id === activeLayerId) || null,
    [layers, activeLayerId]
  );

  const addLayer = useCallback(() => {
    const newLayer = {
      id: `layer-${Date.now()}`,
      name: `图层 ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      objects: [],
      thumbnail: null
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
    return newLayer;
  }, [layers.length]);

  const deleteLayer = useCallback((layerId) => {
    if (layers.length <= 1) return;
    const newLayers = layers.filter(layer => layer.id !== layerId);
    setLayers(newLayers);
    if (activeLayerId === layerId) {
      setActiveLayerId(newLayers[newLayers.length - 1].id);
    }
  }, [layers, activeLayerId]);

  const toggleLayerVisibility = useCallback((layerId) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  }, []);

  const updateLayer = useCallback((layerId, updater) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, ...updater(layer) } : layer
      )
    );
  }, []);

  const toggleLayerLock = useCallback((layerId) => {
    setLayers(prev =>
      prev.map(layer =>
        layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
      )
    );
  }, []);

  return {
    layers,
    activeLayerId,
    activeLayer,
    setLayers,
    setActiveLayerId,
    addLayer,
    deleteLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    updateLayer
  };
}
