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
      '@/application': path.resolve(__dirname, 'src/application'),
      '@/assets': path.resolve(__dirname, 'src/assets'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/css': path.resolve(__dirname, 'src/css'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@/presentation': path.resolve(__dirname, 'src/presentation'),
      '@/stores': path.resolve(__dirname, 'src/stores'),
    },
  },
})
