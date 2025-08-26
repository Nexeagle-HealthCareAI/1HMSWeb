import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  server: {
    host: "::",
    port: 3000,
  },
  preview: {
    port: 3000,
    host: true,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "react": path.resolve(__dirname, "node_modules/react"),
      "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
    },
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-tooltip', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-select', '@radix-ui/react-checkbox', '@radix-ui/react-radio-group', '@radix-ui/react-slider', '@radix-ui/react-switch', '@radix-ui/react-toast', '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio', '@radix-ui/react-avatar', '@radix-ui/react-badge', '@radix-ui/react-breadcrumb', '@radix-ui/react-button', '@radix-ui/react-calendar', '@radix-ui/react-card', '@radix-ui/react-carousel', '@radix-ui/react-chart', '@radix-ui/react-collapsible', '@radix-ui/react-command', '@radix-ui/react-context-menu', '@radix-ui/react-drawer', '@radix-ui/react-form', '@radix-ui/react-hover-card', '@radix-ui/react-input-otp', '@radix-ui/react-label', '@radix-ui/react-menubar', '@radix-ui/react-navigation-menu', '@radix-ui/react-pagination', '@radix-ui/react-popover', '@radix-ui/react-progress', '@radix-ui/react-resizable', '@radix-ui/react-scroll-area', '@radix-ui/react-separator', '@radix-ui/react-sheet', '@radix-ui/react-sidebar', '@radix-ui/react-skeleton', '@radix-ui/react-sonner', '@radix-ui/react-table', '@radix-ui/react-textarea', '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip'],
          'query-vendor': ['@tanstack/react-query'],
          'zustand-vendor': ['zustand'],
          'axios-vendor': ['axios'],
          'auth-feature': ['./src/features/auth'],
          'dashboard-feature': ['./src/features/dashboard', './src/features/doctor'],
          'appointment-feature': ['./src/features/appointment'],
          'ai-feature': ['./src/features/ai'],
          'profile-feature': ['./src/features/profile'],
          'hospital-feature': ['./src/features/hospital'],
          'billing-feature': ['./src/features/billing'],
          'patient-feature': ['./src/features/patient'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      mangle: {
        safari10: true
      }
    } : undefined
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'axios',
      'lucide-react'
    ],
    exclude: []
  },
  define: {
    __DEV__: mode === 'development'
  }
}));
