import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Root-Env laden
  const envPath = path.resolve(__dirname, '../.env');
  const env = loadEnv(mode, process.cwd(), '');
  if (fs.existsSync(envPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    Object.assign(process.env, parsed);
  }

  // Frontend wird nur über Backend (Port 3000) serviert
  // Kein separater Dev Server mehr nötig

  return {
  plugins: [react()],
  // Kein Dev Server mehr - Frontend wird nur über Backend serviert
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
  resolve: {
    alias: {
      '@/application': path.resolve(__dirname, 'src/application'),
      '@/assets': path.resolve(__dirname, 'src/assets'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/config': path.resolve(__dirname, 'src/config'),
      '@/css': path.resolve(__dirname, 'src/css'),
      '@/scss': path.resolve(__dirname, 'src/scss'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/hooks': path.resolve(__dirname, 'src/hooks'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@/presentation': path.resolve(__dirname, 'src/presentation'),
      '@/stores': path.resolve(__dirname, 'src/stores'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/scss/abstracts/variables" as *;`
      }
    }
  },
    define: {
      // Frontend läuft nur über Backend (Port 3000) - same-origin URLs
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(
        process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : `https://${process.env.DOMAIN}`
      ),
      'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(
        process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : `https://${process.env.DOMAIN}`
      ),
    }
  };
});
