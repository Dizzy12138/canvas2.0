import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from './App';

vi.mock('@frontend/components/AppBuilder', () => ({
  default: () => <div>App Builder Mock</div>
}), { virtual: true });

vi.mock('./components/WorkflowEditorPage.jsx', () => ({
  default: () => <div>Workflow Editor Mock</div>
}));

vi.mock('./components/OuzhiArtPlatform.jsx', () => ({
  default: () => <div>Ouzhi Art Mock</div>
}));

afterEach(() => {
  cleanup();
});

describe('App navigation icons', () => {
  it('renders lucide icons inside each navigation button', () => {
    render(<App />);

    const workflowButton = screen.getByRole('button', { name: '工作流' });
    const appBuilderButton = screen.getByRole('button', { name: '应用构建器' });
    const ouzhiButton = screen.getByRole('button', { name: '欧智艺术' });

    expect(workflowButton.querySelector('svg')).not.toBeNull();
    expect(appBuilderButton.querySelector('svg')).not.toBeNull();
    expect(ouzhiButton.querySelector('svg')).not.toBeNull();
  });
});
