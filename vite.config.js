import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 允许通过环境变量覆盖后端目标与端口
const BACKEND_TARGET = process.env.VITE_BACKEND_TARGET || 'http://localhost:8000';
const DEV_PORT = Number(process.env.VITE_DEV_PORT || 3000);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: DEV_PORT,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (process.env.VITE_PROXY_LOG === '1') {
              console.log('Sending Request to the Target:', req.method, req.url);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (process.env.VITE_PROXY_LOG === '1') {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            }
          });
        },
      },
      '/socket.io': {
        target: BACKEND_TARGET,
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

