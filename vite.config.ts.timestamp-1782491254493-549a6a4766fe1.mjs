// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/@vitejs/plugin-react-swc/index.js";
import { VitePWA } from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/vite-plugin-pwa/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\mtnoo\\OneDrive\\Desktop\\EasyHMS\\easyHMSWeb";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const defaultApiHost = "http://151.185.45.77:5001";
  const rawApiBaseUrl = env.VITE_API_BASE_URL || defaultApiHost;
  const apiBaseUrl = rawApiBaseUrl.startsWith("http://") || rawApiBaseUrl.startsWith("https://") ? rawApiBaseUrl : `https://${rawApiBaseUrl.replace(/^\/\//, "")}`;
  const createProxyConfig = (pathRewrite) => ({
    target: apiBaseUrl,
    changeOrigin: true,
    secure: false,
    ...pathRewrite && { rewrite: pathRewrite },
    configure: (proxy, _options) => {
      proxy.on("error", (err, _req, _res) => {
        console.log("proxy error", err);
      });
      proxy.on("proxyReq", (proxyReq, req, _res) => {
        console.log("Sending Request to the Target:", req.method, req.url);
      });
      proxy.on("proxyRes", (proxyRes, req, _res) => {
        console.log("Received Response from the Target:", proxyRes.statusCode, req.url);
      });
    }
  });
  return {
    base: "/",
    server: {
      host: "::",
      port: 3e3,
      cors: true,
      proxy: {
        "/api": createProxyConfig((path2) => path2.replace(/^\/api/, "")),
        "/doctors": createProxyConfig(),
        "/prescription": createProxyConfig(),
        "/auth": createProxyConfig(),
        "/admin": createProxyConfig(),
        "/patient-profile": createProxyConfig(),
        "/blob-proxy": {
          target: "http://151.185.45.77:9000",
          changeOrigin: true,
          secure: false,
          rewrite: (path2) => path2.replace(/^\/blob-proxy/, "")
        }
      }
    },
    preview: {
      port: 3e3,
      host: true
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        // registered manually in src/offline/registerSW.ts
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
          navigateFallback: "/index.html",
          // Never serve the SPA shell for API/health calls.
          navigateFallbackDenylist: [/^\/api/, /^\/health/, /^\/auth/, /^\/doctors/, /^\/prescription/, /^\/admin/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // Deliberately NOT caching API responses in the SW — PHI offline reads are served from the
          // encrypted IndexedDB Query cache, so plaintext PHI never lands in Cache Storage.
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === "font",
              handler: "CacheFirst",
              options: { cacheName: "fonts", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 } }
            },
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: { cacheName: "images", expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 } }
            }
          ]
        },
        manifest: {
          name: "1HMS",
          short_name: "1HMS",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#4f46e5"
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    build: {
      chunkSizeWarningLimit: 1e3,
      sourcemap: mode === "development",
      minify: mode === "production" ? "terser" : false,
      terserOptions: mode === "production" ? {
        compress: {
          drop_console: false,
          drop_debugger: false
        },
        mangle: {
          safari10: true
        }
      } : void 0,
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
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js"
        }
      }
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "zustand",
        "axios",
        "lucide-react",
        "@fullcalendar/react",
        "@fullcalendar/daygrid",
        "@fullcalendar/timegrid",
        "@fullcalendar/interaction",
        "react-hook-form",
        "@hookform/resolvers",
        "zod",
        "date-fns",
        "clsx",
        "tailwind-merge"
      ],
      exclude: []
    },
    define: {
      __DEV__: mode === "development"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtdG5vb1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXEVhc3lITVNcXFxcZWFzeUhNU1dlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcbXRub29cXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxFYXN5SE1TXFxcXGVhc3lITVNXZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL210bm9vL09uZURyaXZlL0Rlc2t0b3AvRWFzeUhNUy9lYXN5SE1TV2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zdCBkZWZhdWx0QXBpSG9zdCA9ICdodHRwOi8vMTUxLjE4NS40NS43Nzo1MDAxJztcclxuICBjb25zdCByYXdBcGlCYXNlVXJsID0gZW52LlZJVEVfQVBJX0JBU0VfVVJMIHx8IGRlZmF1bHRBcGlIb3N0O1xyXG4gIGNvbnN0IGFwaUJhc2VVcmwgPSByYXdBcGlCYXNlVXJsLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSB8fCByYXdBcGlCYXNlVXJsLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJylcclxuICAgID8gcmF3QXBpQmFzZVVybFxyXG4gICAgOiBgaHR0cHM6Ly8ke3Jhd0FwaUJhc2VVcmwucmVwbGFjZSgvXlxcL1xcLy8sICcnKX1gO1xyXG5cclxuICBjb25zdCBjcmVhdGVQcm94eUNvbmZpZyA9IChwYXRoUmV3cml0ZT86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZykgPT4gKHtcclxuICAgIHRhcmdldDogYXBpQmFzZVVybCxcclxuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAuLi4ocGF0aFJld3JpdGUgJiYgeyByZXdyaXRlOiBwYXRoUmV3cml0ZSB9KSxcclxuICAgIGNvbmZpZ3VyZTogKHByb3h5OiBhbnksIF9vcHRpb25zOiBhbnkpID0+IHtcclxuICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogYW55LCBfcmVxOiBhbnksIF9yZXM6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdwcm94eSBlcnJvcicsIGVycik7XHJcbiAgICAgIH0pO1xyXG4gICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXE6IGFueSwgcmVxOiBhbnksIF9yZXM6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gdGhlIFRhcmdldDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlczogYW55LCByZXE6IGFueSwgX3JlczogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gdGhlIFRhcmdldDonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTogJy8nLFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIGhvc3Q6IFwiOjpcIixcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgY29yczogdHJ1ZSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IGNyZWF0ZVByb3h5Q29uZmlnKChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJykpLFxyXG4gICAgICAgICcvZG9jdG9ycyc6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9wcmVzY3JpcHRpb24nOiBjcmVhdGVQcm94eUNvbmZpZygpLFxyXG4gICAgICAgICcvYXV0aCc6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9hZG1pbic6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9wYXRpZW50LXByb2ZpbGUnOiBjcmVhdGVQcm94eUNvbmZpZygpLFxyXG4gICAgICAgICcvYmxvYi1wcm94eSc6IHtcclxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xNTEuMTg1LjQ1Ljc3OjkwMDAnLFxyXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcclxuICAgICAgICAgIHJld3JpdGU6IChwYXRoOiBzdHJpbmcpID0+IHBhdGgucmVwbGFjZSgvXlxcL2Jsb2ItcHJveHkvLCAnJyksXHJcbiAgICAgICAgfSxcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIHByZXZpZXc6IHtcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHJlYWN0KCksXHJcbiAgICAgIFZpdGVQV0Eoe1xyXG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxyXG4gICAgICAgIGluamVjdFJlZ2lzdGVyOiBudWxsLCAvLyByZWdpc3RlcmVkIG1hbnVhbGx5IGluIHNyYy9vZmZsaW5lL3JlZ2lzdGVyU1cudHNcclxuICAgICAgICB3b3JrYm94OiB7XHJcbiAgICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZix3b2ZmMn0nXSxcclxuICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICAvLyBOZXZlciBzZXJ2ZSB0aGUgU1BBIHNoZWxsIGZvciBBUEkvaGVhbHRoIGNhbGxzLlxyXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9hcGkvLCAvXlxcL2hlYWx0aC8sIC9eXFwvYXV0aC8sIC9eXFwvZG9jdG9ycy8sIC9eXFwvcHJlc2NyaXB0aW9uLywgL15cXC9hZG1pbi9dLFxyXG4gICAgICAgICAgY2xlYW51cE91dGRhdGVkQ2FjaGVzOiB0cnVlLFxyXG4gICAgICAgICAgY2xpZW50c0NsYWltOiB0cnVlLFxyXG4gICAgICAgICAgc2tpcFdhaXRpbmc6IHRydWUsXHJcbiAgICAgICAgICAvLyBEZWxpYmVyYXRlbHkgTk9UIGNhY2hpbmcgQVBJIHJlc3BvbnNlcyBpbiB0aGUgU1cgXHUyMDE0IFBISSBvZmZsaW5lIHJlYWRzIGFyZSBzZXJ2ZWQgZnJvbSB0aGVcclxuICAgICAgICAgIC8vIGVuY3J5cHRlZCBJbmRleGVkREIgUXVlcnkgY2FjaGUsIHNvIHBsYWludGV4dCBQSEkgbmV2ZXIgbGFuZHMgaW4gQ2FjaGUgU3RvcmFnZS5cclxuICAgICAgICAgIHJ1bnRpbWVDYWNoaW5nOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyByZXF1ZXN0IH0pID0+IHJlcXVlc3QuZGVzdGluYXRpb24gPT09ICdmb250JyxcclxuICAgICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6ICdmb250cycsIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMzAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAoeyByZXF1ZXN0IH0pID0+IHJlcXVlc3QuZGVzdGluYXRpb24gPT09ICdpbWFnZScsXHJcbiAgICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxyXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHsgY2FjaGVOYW1lOiAnaW1hZ2VzJywgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMjAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDMwIH0gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBtYW5pZmVzdDoge1xyXG4gICAgICAgICAgbmFtZTogJzFITVMnLFxyXG4gICAgICAgICAgc2hvcnRfbmFtZTogJzFITVMnLFxyXG4gICAgICAgICAgc3RhcnRfdXJsOiAnLycsXHJcbiAgICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXHJcbiAgICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI2ZmZmZmZicsXHJcbiAgICAgICAgICB0aGVtZV9jb2xvcjogJyM0ZjQ2ZTUnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgXSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcclxuICAgICAgbWluaWZ5OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAndGVyc2VyJyA6IGZhbHNlLFxyXG4gICAgICB0ZXJzZXJPcHRpb25zOiBtb2RlID09PSAncHJvZHVjdGlvbicgPyB7XHJcbiAgICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsXHJcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmdsZToge1xyXG4gICAgICAgICAgc2FmYXJpMTA6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0gOiB1bmRlZmluZWQsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghYXNzZXRJbmZvLm5hbWUpIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xyXG5cclxuICAgICAgICAgICAgaWYgKC9cXC4oY3NzKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfHN2Z3xnaWZ8dGlmZnxibXB8aWNvKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2ltYWdlcy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoL1xcLih3b2ZmMj98ZW90fHR0ZnxvdGYpJC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvZm9udHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJ1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICBpbmNsdWRlOiBbXHJcbiAgICAgICAgJ3JlYWN0JyxcclxuICAgICAgICAncmVhY3QtZG9tJyxcclxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXHJcbiAgICAgICAgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsXHJcbiAgICAgICAgJ3p1c3RhbmQnLFxyXG4gICAgICAgICdheGlvcycsXHJcbiAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXHJcbiAgICAgICAgJ0BmdWxsY2FsZW5kYXIvcmVhY3QnLFxyXG4gICAgICAgICdAZnVsbGNhbGVuZGFyL2RheWdyaWQnLFxyXG4gICAgICAgICdAZnVsbGNhbGVuZGFyL3RpbWVncmlkJyxcclxuICAgICAgICAnQGZ1bGxjYWxlbmRhci9pbnRlcmFjdGlvbicsXHJcbiAgICAgICAgJ3JlYWN0LWhvb2stZm9ybScsXHJcbiAgICAgICAgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLFxyXG4gICAgICAgICd6b2QnLFxyXG4gICAgICAgICdkYXRlLWZucycsXHJcbiAgICAgICAgJ2Nsc3gnLFxyXG4gICAgICAgICd0YWlsd2luZC1tZXJnZSdcclxuICAgICAgXSxcclxuICAgICAgZXhjbHVkZTogW11cclxuICAgIH0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgX19ERVZfXzogbW9kZSA9PT0gJ2RldmVsb3BtZW50J1xyXG4gICAgfVxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNWLFNBQVMsY0FBYyxlQUFlO0FB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LEdBQUcsRUFBRTtBQUFBLFlBQ3BHO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLFdBQVc7QUFBQSxVQUNYLFNBQVM7QUFBQSxVQUNULGtCQUFrQjtBQUFBLFVBQ2xCLGFBQWE7QUFBQSxRQUNmO0FBQUEsTUFDRixDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsdUJBQXVCO0FBQUEsTUFDdkIsV0FBVyxTQUFTO0FBQUEsTUFDcEIsUUFBUSxTQUFTLGVBQWUsV0FBVztBQUFBLE1BQzNDLGVBQWUsU0FBUyxlQUFlO0FBQUEsUUFDckMsVUFBVTtBQUFBLFVBQ1IsY0FBYztBQUFBLFVBQ2QsZUFBZTtBQUFBLFFBQ2pCO0FBQUEsUUFDQSxRQUFRO0FBQUEsVUFDTixVQUFVO0FBQUEsUUFDWjtBQUFBLE1BQ0YsSUFBSTtBQUFBLE1BQ0osZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sZ0JBQWdCLENBQUMsY0FBYztBQUM3QixnQkFBSSxDQUFDLFVBQVUsS0FBTSxRQUFPO0FBRTVCLGdCQUFJLFdBQVcsS0FBSyxVQUFVLElBQUksR0FBRztBQUNuQyxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSx1Q0FBdUMsS0FBSyxVQUFVLElBQUksR0FBRztBQUMvRCxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxnQkFBSSwyQkFBMkIsS0FBSyxVQUFVLElBQUksR0FBRztBQUNuRCxxQkFBTztBQUFBLFlBQ1Q7QUFDQSxtQkFBTztBQUFBLFVBQ1Q7QUFBQSxVQUNBLGdCQUFnQjtBQUFBLFVBQ2hCLGdCQUFnQjtBQUFBLFFBQ2xCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVMsQ0FBQztBQUFBLElBQ1o7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLFNBQVMsU0FBUztBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
