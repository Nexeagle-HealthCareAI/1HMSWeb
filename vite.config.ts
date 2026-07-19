import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const defaultApiHost = 'http://151.185.45.77:5001';
  const rawApiBaseUrl = env.VITE_API_BASE_URL || defaultApiHost;
  const apiBaseUrl = rawApiBaseUrl.startsWith('http://') || rawApiBaseUrl.startsWith('https://')
    ? rawApiBaseUrl
    : `https://${rawApiBaseUrl.replace(/^\/\//, '')}`;

  const createProxyConfig = (pathRewrite?: (path: string) => string) => ({
    target: apiBaseUrl,
    changeOrigin: true,
    secure: false,
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
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // registered manually in src/offline/registerSW.ts
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          navigateFallback: '/index.html',
          // Never serve the SPA shell for API/health calls.
          navigateFallbackDenylist: [/^\/api/, /^\/health/, /^\/auth/, /^\/doctors/, /^\/prescription/, /^\/admin/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // Deliberately NOT caching API responses in the SW — PHI offline reads are served from the
          // encrypted IndexedDB Query cache, so plaintext PHI never lands in Cache Storage.
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === 'font',
              handler: 'CacheFirst',
              options: { cacheName: 'fonts', expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: { cacheName: 'images', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 } },
            },
          ],
        },
        manifest: {
          name: '1HMS',
          short_name: '1HMS',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#4f46e5',
        },
      }),
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
          drop_console: false,
          drop_debugger: false,
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
