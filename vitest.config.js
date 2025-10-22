import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true
  },
  resolve: {
    alias: [
      { find: '@frontend/components/AppBuilder', replacement: path.resolve(__dirname, './tests/mocks/AppBuilderMock.jsx') },
      { find: '@frontend/components/AppBuilder.jsx', replacement: path.resolve(__dirname, './tests/mocks/AppBuilderMock.jsx') },
      { find: './components/WorkflowEditorPage', replacement: path.resolve(__dirname, './tests/mocks/WorkflowEditorPageMock.jsx') },
      { find: './components/WorkflowEditorPage.jsx', replacement: path.resolve(__dirname, './tests/mocks/WorkflowEditorPageMock.jsx') },
      { find: './components/OuzhiArtPlatform', replacement: path.resolve(__dirname, './tests/mocks/OuzhiArtPlatformMock.jsx') },
      { find: './components/OuzhiArtPlatform.jsx', replacement: path.resolve(__dirname, './tests/mocks/OuzhiArtPlatformMock.jsx') },
      { find: 'canvas', replacement: path.resolve(__dirname, './tests/mocks/canvas.js') },
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@components', replacement: path.resolve(__dirname, './src/components') },
      { find: '@hooks', replacement: path.resolve(__dirname, './src/hooks') },
      { find: '@utils', replacement: path.resolve(__dirname, './src/utils') },
      { find: '@services', replacement: path.resolve(__dirname, './src/services') },
      { find: '@store', replacement: path.resolve(__dirname, './src/store') },
      { find: '@types', replacement: path.resolve(__dirname, './src/types') },
      { find: '@frontend', replacement: path.resolve(__dirname, './frontend/src') }
    ]
  }
});
