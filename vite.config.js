import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base public path - empty string means relative paths
  base: '/',
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/navigation": path.resolve(__dirname, "./src/lib/next-shims/navigation.js"),
    },
  },
  build: {
    // Generate JS files with standard extensions
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true, // Generate a manifest.json in the dist folder
    sourcemap: mode !== 'production', // Only generate sourcemaps in development
    minify: mode === 'production',
    rollupOptions: {
      output: {
        // Ensure proper extensions and formats
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Avoid vendor chunk being too large
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Group node_modules into vendor chunks
            if (id.includes('react')) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        },
      },
    },
    // Ensure proper MIME types
    assetsInlineLimit: 0, // Disable asset inlining
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
})); 