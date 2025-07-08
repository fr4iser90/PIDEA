import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4005,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          state: ['zustand']
        }
      }
    }
  },
  preview: {
    port: 4005
  },
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/application': path.resolve(__dirname, 'src/application'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/css': path.resolve(__dirname, 'src/css'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@/presentation': path.resolve(__dirname, 'src/presentation'),
      '@/stores': path.resolve(__dirname, 'src/stores'),
      '@/assets': path.resolve(__dirname, 'src/assets'),
    },
  },
})
