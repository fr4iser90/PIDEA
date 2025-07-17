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

  // Automatische Port-Erkennung: Docker vs npm run dev
  const isDocker = process.env.DOCKER_ENV === 'true' || 
                   process.env.KUBERNETES_SERVICE_HOST ||
                   process.env.DOCKER_CONTAINER ||
                   process.env.HOSTNAME?.includes('container') ||
                   process.env.HOSTNAME?.includes('docker');
  
  let frontendPort = isDocker ? 80 : 4000;
  if (process.env.FRONTEND_URL) {
    const match = process.env.FRONTEND_URL.match(/:(\d+)(?:$|\/)/);
    if (match) {
      frontendPort = Number(match[1]);
    }
  }

  return {
    plugins: [react()],
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: process.env.BACKEND_URL?.replace('http://', 'ws://'),
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
      port: frontendPort
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
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(process.env.BACKEND_URL),
      'import.meta.env.VITE_FRONTEND_URL': JSON.stringify(process.env.FRONTEND_URL),
    }
  };
});
