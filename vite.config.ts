import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

const CUBING_API = 'https://api.cubing.com';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || '/cubingchina-oldstyle/';

  return {
    base,
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/cubing-api': {
          target: CUBING_API,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/cubing-api/, ''),
        },
      },
    },
    preview: {
      port: 4173,
      proxy: {
        '/cubing-api': {
          target: CUBING_API,
          changeOrigin: true,
          secure: true,
          rewrite: (path: string) => path.replace(/^\/cubing-api/, ''),
        },
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            echarts: ['echarts'],
            vendor: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
          },
        },
      },
    },
  };
});
