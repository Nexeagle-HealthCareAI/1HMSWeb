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
        "/patient-profile": createProxyConfig()
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
        devOptions: {
          enabled: true,
          type: "module",
          navigateFallback: "index.html"
        },
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtdG5vb1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXEVhc3lITVNcXFxcZWFzeUhNU1dlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcbXRub29cXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxFYXN5SE1TXFxcXGVhc3lITVNXZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL210bm9vL09uZURyaXZlL0Rlc2t0b3AvRWFzeUhNUy9lYXN5SE1TV2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zdCBkZWZhdWx0QXBpSG9zdCA9ICdodHRwOi8vMTUxLjE4NS40NS43Nzo1MDAxJztcclxuICBjb25zdCByYXdBcGlCYXNlVXJsID0gZW52LlZJVEVfQVBJX0JBU0VfVVJMIHx8IGRlZmF1bHRBcGlIb3N0O1xyXG4gIGNvbnN0IGFwaUJhc2VVcmwgPSByYXdBcGlCYXNlVXJsLnN0YXJ0c1dpdGgoJ2h0dHA6Ly8nKSB8fCByYXdBcGlCYXNlVXJsLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJylcclxuICAgID8gcmF3QXBpQmFzZVVybFxyXG4gICAgOiBgaHR0cHM6Ly8ke3Jhd0FwaUJhc2VVcmwucmVwbGFjZSgvXlxcL1xcLy8sICcnKX1gO1xyXG5cclxuICBjb25zdCBjcmVhdGVQcm94eUNvbmZpZyA9IChwYXRoUmV3cml0ZT86IChwYXRoOiBzdHJpbmcpID0+IHN0cmluZykgPT4gKHtcclxuICAgIHRhcmdldDogYXBpQmFzZVVybCxcclxuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAuLi4ocGF0aFJld3JpdGUgJiYgeyByZXdyaXRlOiBwYXRoUmV3cml0ZSB9KSxcclxuICAgIGNvbmZpZ3VyZTogKHByb3h5OiBhbnksIF9vcHRpb25zOiBhbnkpID0+IHtcclxuICAgICAgcHJveHkub24oJ2Vycm9yJywgKGVycjogYW55LCBfcmVxOiBhbnksIF9yZXM6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdwcm94eSBlcnJvcicsIGVycik7XHJcbiAgICAgIH0pO1xyXG4gICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXE6IGFueSwgcmVxOiBhbnksIF9yZXM6IGFueSkgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdTZW5kaW5nIFJlcXVlc3QgdG8gdGhlIFRhcmdldDonLCByZXEubWV0aG9kLCByZXEudXJsKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHByb3h5Lm9uKCdwcm94eVJlcycsIChwcm94eVJlczogYW55LCByZXE6IGFueSwgX3JlczogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1JlY2VpdmVkIFJlc3BvbnNlIGZyb20gdGhlIFRhcmdldDonLCBwcm94eVJlcy5zdGF0dXNDb2RlLCByZXEudXJsKTtcclxuICAgICAgfSk7XHJcbiAgICB9LFxyXG4gIH0pO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgYmFzZTogJy8nLFxyXG4gICAgc2VydmVyOiB7XHJcbiAgICAgIGhvc3Q6IFwiOjpcIixcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgY29yczogdHJ1ZSxcclxuICAgICAgcHJveHk6IHtcclxuICAgICAgICAnL2FwaSc6IGNyZWF0ZVByb3h5Q29uZmlnKChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJykpLFxyXG4gICAgICAgICcvZG9jdG9ycyc6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9wcmVzY3JpcHRpb24nOiBjcmVhdGVQcm94eUNvbmZpZygpLFxyXG4gICAgICAgICcvYXV0aCc6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9hZG1pbic6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9wYXRpZW50LXByb2ZpbGUnOiBjcmVhdGVQcm94eUNvbmZpZygpLFxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgcHJldmlldzoge1xyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBob3N0OiB0cnVlLFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgVml0ZVBXQSh7XHJcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgICAgaW5qZWN0UmVnaXN0ZXI6IG51bGwsIC8vIHJlZ2lzdGVyZWQgbWFudWFsbHkgaW4gc3JjL29mZmxpbmUvcmVnaXN0ZXJTVy50c1xyXG4gICAgICAgIGRldk9wdGlvbnM6IHtcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICB0eXBlOiAnbW9kdWxlJyxcclxuICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmLHdvZmYyfSddLFxyXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIC8vIE5ldmVyIHNlcnZlIHRoZSBTUEEgc2hlbGwgZm9yIEFQSS9oZWFsdGggY2FsbHMuXHJcbiAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaS8sIC9eXFwvaGVhbHRoLywgL15cXC9hdXRoLywgL15cXC9kb2N0b3JzLywgL15cXC9wcmVzY3JpcHRpb24vLCAvXlxcL2FkbWluL10sXHJcbiAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXHJcbiAgICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXHJcbiAgICAgICAgICBza2lwV2FpdGluZzogdHJ1ZSxcclxuICAgICAgICAgIC8vIERlbGliZXJhdGVseSBOT1QgY2FjaGluZyBBUEkgcmVzcG9uc2VzIGluIHRoZSBTVyBcdTIwMTQgUEhJIG9mZmxpbmUgcmVhZHMgYXJlIHNlcnZlZCBmcm9tIHRoZVxyXG4gICAgICAgICAgLy8gZW5jcnlwdGVkIEluZGV4ZWREQiBRdWVyeSBjYWNoZSwgc28gcGxhaW50ZXh0IFBISSBuZXZlciBsYW5kcyBpbiBDYWNoZSBTdG9yYWdlLlxyXG4gICAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5kZXN0aW5hdGlvbiA9PT0gJ2ZvbnQnLFxyXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ2ZvbnRzJywgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAzMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5kZXN0aW5hdGlvbiA9PT0gJ2ltYWdlJyxcclxuICAgICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6ICdpbWFnZXMnLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEyMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzAgfSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgICBuYW1lOiAnMUhNUycsXHJcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnMUhNUycsXHJcbiAgICAgICAgICBzdGFydF91cmw6ICcvJyxcclxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcclxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzRmNDZlNScsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICBdLFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczoge1xyXG4gICAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgICAgc291cmNlbWFwOiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnLFxyXG4gICAgICBtaW5pZnk6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/ICd0ZXJzZXInIDogZmFsc2UsXHJcbiAgICAgIHRlcnNlck9wdGlvbnM6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IHtcclxuICAgICAgICBjb21wcmVzczoge1xyXG4gICAgICAgICAgZHJvcF9jb25zb2xlOiBmYWxzZSxcclxuICAgICAgICAgIGRyb3BfZGVidWdnZXI6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbWFuZ2xlOiB7XHJcbiAgICAgICAgICBzYWZhcmkxMDogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgfSA6IHVuZGVmaW5lZCxcclxuICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgIG91dHB1dDoge1xyXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcclxuICAgICAgICAgICAgaWYgKCFhc3NldEluZm8ubmFtZSkgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcblxyXG4gICAgICAgICAgICBpZiAoL1xcLihjc3MpJC8udGVzdChhc3NldEluZm8ubmFtZSkpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoL1xcLihwbmd8anBlP2d8c3ZnfGdpZnx0aWZmfGJtcHxpY28pJC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvaW1hZ2VzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICgvXFwuKHdvZmYyP3xlb3R8dHRmfG90ZikkL2kudGVzdChhc3NldEluZm8ubmFtZSkpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9mb250cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gYGFzc2V0cy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICAgIGluY2x1ZGU6IFtcclxuICAgICAgICAncmVhY3QnLFxyXG4gICAgICAgICdyZWFjdC1kb20nLFxyXG4gICAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcclxuICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcclxuICAgICAgICAnenVzdGFuZCcsXHJcbiAgICAgICAgJ2F4aW9zJyxcclxuICAgICAgICAnbHVjaWRlLXJlYWN0JyxcclxuICAgICAgICAnQGZ1bGxjYWxlbmRhci9yZWFjdCcsXHJcbiAgICAgICAgJ0BmdWxsY2FsZW5kYXIvZGF5Z3JpZCcsXHJcbiAgICAgICAgJ0BmdWxsY2FsZW5kYXIvdGltZWdyaWQnLFxyXG4gICAgICAgICdAZnVsbGNhbGVuZGFyL2ludGVyYWN0aW9uJyxcclxuICAgICAgICAncmVhY3QtaG9vay1mb3JtJyxcclxuICAgICAgICAnQGhvb2tmb3JtL3Jlc29sdmVycycsXHJcbiAgICAgICAgJ3pvZCcsXHJcbiAgICAgICAgJ2RhdGUtZm5zJyxcclxuICAgICAgICAnY2xzeCcsXHJcbiAgICAgICAgJ3RhaWx3aW5kLW1lcmdlJ1xyXG4gICAgICBdLFxyXG4gICAgICBleGNsdWRlOiBbXVxyXG4gICAgfSxcclxuICAgIGRlZmluZToge1xyXG4gICAgICBfX0RFVl9fOiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnXHJcbiAgICB9XHJcbiAgfTtcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1YsU0FBUyxjQUFjLGVBQWU7QUFDNVgsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUN4QixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENB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
