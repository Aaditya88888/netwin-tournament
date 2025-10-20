import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@shared': path.resolve(__dirname, '../server/shared'),
      },
    },
    define: {
      // Expose env variables to the client      'import.meta.env.VITE_FB_API_KEY': JSON.stringify(env.VITE_FB_API_KEY),
      'import.meta.env.VITE_FB_AUTH_DOMAIN': JSON.stringify(env.VITE_FB_AUTH_DOMAIN),
      'import.meta.env.VITE_FB_PROJECT_ID': JSON.stringify(env.VITE_FB_PROJECT_ID),
      'import.meta.env.VITE_FB_STORAGE_BUCKET': JSON.stringify(env.VITE_FB_STORAGE_BUCKET),
      'import.meta.env.VITE_FB_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FB_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FB_APP_ID': JSON.stringify(env.VITE_FB_APP_ID),
      'import.meta.env.VITE_FB_MEASUREMENT_ID': JSON.stringify(env.VITE_FB_MEASUREMENT_ID),
      'import.meta.env.VITE_FB_APP_CHECK_TOKEN': JSON.stringify(env.VITE_FB_APP_CHECK_TOKEN),
      'import.meta.env.VITE_RECAPTCHA_SITE_KEY': JSON.stringify(env.VITE_RECAPTCHA_SITE_KEY),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
    envDir: '..',
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          },
        },
      },
    },
    server: {
      port: 3000, // Admin frontend on 3000
      proxy: {
        '/api': {
          target: 'http://localhost:5002', // Updated to match admin backend
          changeOrigin: true,
        },
      },
    },
  };
});