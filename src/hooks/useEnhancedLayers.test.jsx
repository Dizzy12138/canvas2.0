import React, { act } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { useEnhancedLayers } from './useEnhancedLayers';

const renderHook = (callback, { initialProps } = {}) => {
  const result = { current: undefined };

  function HookTester({ hookProps }) {
    result.current = callback(hookProps);
    return null;
  }

  const utils = render(<HookTester hookProps={initialProps} />);

  return {
    result,
    rerender: (hookProps) => utils.rerender(<HookTester hookProps={hookProps} />),
    unmount: utils.unmount
  };
};

afterEach(() => {
  cleanup();
});

describe('useEnhancedLayers', () => {
  it('initialises with provided layers and active layer', () => {
    const initialLayers = [
      { id: 'layer-1', name: '背景', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 }
    ];
    const { result } = renderHook(() => useEnhancedLayers(initialLayers));

    expect(result.current.layers).toHaveLength(1);
    expect(result.current.activeLayerId).toBe('layer-1');
  });

  it('adds a new layer and updates the active layer id', () => {
    const { result } = renderHook(() => useEnhancedLayers([]));

    act(() => {
      result.current.addLayer({ name: '新图层' });
    });

    expect(result.current.layers).toHaveLength(1);
    expect(result.current.layers[0].name).toBe('新图层');
    expect(result.current.activeLayerId).toBe(result.current.layers[0].id);
  });

  it('toggles layer visibility and locking state', () => {
    const initialLayers = [
      { id: 'layer-1', name: '测试', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 }
    ];
    const { result } = renderHook(() => useEnhancedLayers(initialLayers));

    act(() => {
      result.current.toggleLayerVisibility('layer-1');
      result.current.toggleLayerLock('layer-1');
    });

    const targetLayer = result.current.layers[0];
    expect(targetLayer.visible).toBe(false);
    expect(targetLayer.locked).toBe(true);
  });

  it('updates opacity and blend mode for a layer', () => {
    const initialLayers = [
      { id: 'layer-1', name: '测试', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 }
    ];
    const { result } = renderHook(() => useEnhancedLayers(initialLayers));

    act(() => {
      result.current.setLayerOpacity('layer-1', 0.5);
      result.current.setLayerBlendMode('layer-1', 'multiply');
    });

    const targetLayer = result.current.layers[0];
    expect(targetLayer.opacity).toBe(0.5);
    expect(targetLayer.blendMode).toBe('multiply');
  });

  it('deletes a layer and maintains active layer consistency', () => {
    const initialLayers = [
      { id: 'layer-1', name: 'Layer 1', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 0 },
      { id: 'layer-2', name: 'Layer 2', visible: true, locked: false, opacity: 1, blendMode: 'normal', objects: [], orderIndex: 1 }
    ];
    const { result } = renderHook(() => useEnhancedLayers(initialLayers));

    act(() => {
      result.current.setActiveLayerId('layer-2');
    });

    act(() => {
      result.current.deleteLayer('layer-2');
    });

    expect(result.current.layers).toHaveLength(1);
    expect(result.current.activeLayerId).toBe('layer-1');
  });
});
