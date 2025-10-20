import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Use process.cwd() for compatibility with TypeScript compilation
const __dirname = process.cwd();

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "server/shared"),
    },
  },
  root: path.resolve(__dirname, "client"),  build: {
    outDir: path.resolve(__dirname, "client/dist"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ['recharts'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      },
    },
  },
});
