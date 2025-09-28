import { describe, test, expect } from 'vitest';
import { computeGridBackgroundStyle } from '../../src/components/GridRulerOverlay.jsx';

describe('computeGridBackgroundStyle', () => {
  test('returns display none when grid should be hidden', () => {
    const style = computeGridBackgroundStyle({
      showGrid: false,
      width: 300,
      height: 200,
      gridSize: 20,
      gridOpacity: 0.1,
      scale: 1,
      panX: 0,
      panY: 0
    });

    expect(style).toEqual({ display: 'none' });
  });

  test('produces repeated gradients with offsets when visible', () => {
    const style = computeGridBackgroundStyle({
      showGrid: true,
      width: 300,
      height: 200,
      gridSize: 20,
      gridOpacity: 0.2,
      scale: 1,
      panX: 5,
      panY: 10
    });

    expect(style.backgroundImage).toContain('repeating-linear-gradient');
    expect(style.backgroundPosition).toContain('-');
    expect(style.backgroundRepeat).toBe('repeat');
  });
});
