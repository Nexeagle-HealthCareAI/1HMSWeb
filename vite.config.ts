import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'https://easyhmsapi-b2fpcsh4cpbafxf0.centralindia-01.azurewebsites.net';

  const createProxyConfig = (pathRewrite?: (path: string) => string) => ({
    target: apiBaseUrl,
    changeOrigin: true,
    secure: true,
    ...(pathRewrite && { rewrite: pathRewrite }),
    configure: (proxy: any, _options: any) => {
      proxy.on('error', (err: any, _req: any, _res: any) => {
        console.log('proxy error', err);
      });
      proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
        console.log('Sending Request to the Target:', req.method, req.url);
      });
      proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
        console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
      });
    },
  });

  return {
    base: '/',
    server: {
      host: "::",
      port: 3000,
      cors: true,
      proxy: {
        '/api': createProxyConfig((path) => path.replace(/^\/api/, '')),
        '/doctors': createProxyConfig(),
        '/prescription': createProxyConfig(),
        '/auth': createProxyConfig(),
        '/admin': createProxyConfig(),
        '/patient-profile': createProxyConfig(),
      }
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
      } : undefined,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (!assetInfo.name) return `assets/[name]-[hash][extname]`;
            
            if (/\.(css)$/.test(assetInfo.name)) {
              return `assets/[name]-[hash][extname]`;
            }
            if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js'
        }
      }
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
  };
});
