import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('node_modules')) {
              // Messaging y App Check solo se importan dinámicamente cuando el
              // usuario activa esas funciones. Mantenerlos fuera del chunk base
              // de Firebase evita descargarlos durante el arranque de la app.
              if (normalizedId.includes('firebase/messaging') || normalizedId.includes('@firebase/messaging')) {
                return 'firebase-messaging';
              }
              if (normalizedId.includes('firebase/app-check') || normalizedId.includes('@firebase/app-check')) {
                return 'firebase-app-check';
              }
              if (normalizedId.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (normalizedId.includes('framer-motion') || normalizedId.includes('gsap')) {
                return 'vendor-motion';
              }
              if (normalizedId.includes('recharts')) {
                return 'vendor-charts';
              }
            }
          }
        }
      }
    }
  };
});
