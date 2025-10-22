import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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

describe('App navigation', () => {
  it('renders primary navigation buttons', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '工作流' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '应用构建器' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '欧智艺术' })).toBeInTheDocument();
  });

  it('displays the App Builder view by default', () => {
    render(<App />);

    expect(screen.getByText('App Builder Mock')).toBeInTheDocument();
  });

  it('navigates between views when navigation buttons are clicked', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '工作流' }));
    expect(screen.getByText('Workflow Editor Mock')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '欧智艺术' }));
    expect(screen.getByText('Ouzhi Art Mock')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '应用构建器' }));
    expect(screen.getByText('App Builder Mock')).toBeInTheDocument();
  });
});
