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
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // React and React-DOM must be bundled together and loaded first
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          
          // Other vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            if (id.includes('@fullcalendar')) {
              return 'calendar-vendor';
            }
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'form-vendor';
            }
            if (id.includes('axios') || id.includes('zustand') || id.includes('date-fns') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'utils-vendor';
            }
            // Group remaining node_modules into a single vendor chunk
            return 'vendor';
          }
          
          // Feature chunks
          if (id.includes('/features/auth/')) {
            return 'auth-feature';
          }
          if (id.includes('/features/dashboard/') || id.includes('/features/doctor/')) {
            return 'dashboard-feature';
          }
          if (id.includes('/features/appointment/')) {
            return 'appointment-feature';
          }
          if (id.includes('/features/ai/')) {
            return 'ai-feature';
          }
          if (id.includes('/features/profile/')) {
            return 'profile-feature';
          }
          if (id.includes('/features/hospital/')) {
            return 'hospital-feature';
          }
          if (id.includes('/features/billing/')) {
            return 'billing-feature';
          }
          if (id.includes('/features/patient/')) {
            return 'patient-feature';
          }
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
      'lucide-react',
      '@fullcalendar/react',
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip',
      'react-hook-form',
      '@hookform/resolvers',
      'zod',
      'date-fns',
      'clsx',
      'tailwind-merge'
    ],
    exclude: []
  },
  define: {
    __DEV__: mode === 'development'
  }
}));
