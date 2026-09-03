import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('recharts') || id.includes('chart.js') || id.includes('react-chartjs-2')) {
                  return 'vendor-charts';
                }
                if (id.includes('d3')) {
                  return 'vendor-d3';
                }
                if (id.includes('xlsx') || id.includes('file-saver') || id.includes('jspdf') || id.includes('html2canvas')) {
                  return 'vendor-export';
                }
              }
            },
          },
        },
      }
    };
});
