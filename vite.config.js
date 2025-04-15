import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";

const isDevelopment = process.env.NODE_ENV === "development";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: true,
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [
    react(),
    isDevelopment && visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react', 
            'react-dom', 
            'react-router-dom',
          ],
          ui: [
            '@/components/ui',
          ],
          auth: [
            '@/context/AuthContext',
          ],
          admin: [
            './src/pages/admin/Dashboard.jsx',
            './src/pages/admin/Services.jsx',
            './src/pages/admin/Documents.jsx',
            './src/pages/admin/Users.jsx',
          ],
          documents: [
            './src/pages/Documents.jsx',
            './src/pages/DocumentView.jsx',
          ],
          authentication: [
            './src/pages/Login.jsx',
            './src/pages/Signup.jsx',
            './src/pages/ForgotPassword.jsx',
            './src/pages/ResetPassword.jsx',
          ],
        },
      },
    },
  },
}); 