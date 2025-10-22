import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@frontend': path.resolve(__dirname, './frontend/src'),
    },
  },
  server: {
    port: 3000, // 恢复默认端口为3000
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8001', // 恢复为后端端口8001
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8001', // 恢复为后端端口8001
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          fabric: ['fabric'],
        },
      },
    },
  },
})