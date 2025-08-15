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
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-slot', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-accordion', '@radix-ui/react-scroll-area', '@radix-ui/react-tooltip'],
          'query-vendor': ['@tanstack/react-query'],
          'zustand-vendor': ['zustand'],
          'axios-vendor': ['axios'],
          
          // Feature chunks
          'auth-feature': [
            './src/features/auth/components/SecureLogin.tsx',
            './src/features/auth/components/Registration.tsx',
            './src/features/auth/pages/LoginPage.tsx'
          ],
          'dashboard-feature': [
            './src/features/dashboard/components/AdminDashboard.tsx',
            './src/features/doctor/components/DocBoard.tsx'
          ],
          'appointment-feature': [
            './src/features/appointment/components/AppointmentDashboard.tsx',
            './src/features/appointment/components/AppointmentBooking.tsx',
            './src/features/appointment/components/AppointmentOversight.tsx'
          ],
          'ai-feature': [
            './src/features/ai/components/DocAI.tsx'
          ],
          'profile-feature': [
            './src/features/profile/components/ProfilePage.tsx'
          ],
          'hospital-feature': [
            './src/features/hospital/components/SystemConfiguration.tsx'
          ],
          'billing-feature': [
            './src/features/billing/components/Billing.tsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: mode === 'development',
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true
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
    ]
  }
}));
