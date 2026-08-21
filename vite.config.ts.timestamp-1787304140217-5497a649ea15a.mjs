// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/@vitejs/plugin-react-swc/index.js";
import { VitePWA } from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/vite-plugin-pwa/dist/index.js";
import basicSsl from "file:///C:/Users/mtnoo/OneDrive/Desktop/EasyHMS/easyHMSWeb/node_modules/@vitejs/plugin-basic-ssl/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\mtnoo\\OneDrive\\Desktop\\EasyHMS\\easyHMSWeb";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const defaultApiHost = "https://1hms-dev-api.nexeagle.com";
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
        // Catch-all for axiosClient's dev-mode baseURL (see src/services/axiosClient.ts) — every
        // API_ENDPOINTS path (most with no leading slash, e.g. 'auth/user/login', but some like
        // SUBSCRIPTION already embedding '/api/v1/...') lands here as /dev-api/<original path>,
        // gets the /dev-api prefix stripped, and forwards to apiBaseUrl exactly as the old
        // absolute-URL axios baseURL used to hit it directly. Needed because the dev server serves
        // over HTTPS (basicSsl, required elsewhere for camera/geolocation) while apiBaseUrl is
        // plain HTTP — browsers block that as mixed content when called directly from the page.
        "/dev-api": createProxyConfig((path2) => path2.replace(/^\/dev-api/, "")),
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
      basicSsl(),
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
          theme_color: "#4f46e5",
          icons: [
            {
              src: "Logo.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "Logo.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png",
              sizes: "512x512",
              type: "image/png"
            }
          ]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxtdG5vb1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXEVhc3lITVNcXFxcZWFzeUhNU1dlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcbXRub29cXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxFYXN5SE1TXFxcXGVhc3lITVNXZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL210bm9vL09uZURyaXZlL0Rlc2t0b3AvRWFzeUhNUy9lYXN5SE1TV2ViL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gXCJ2aXRlLXBsdWdpbi1wd2FcIjtcclxuaW1wb3J0IGJhc2ljU3NsIGZyb20gXCJAdml0ZWpzL3BsdWdpbi1iYXNpYy1zc2xcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zdCBkZWZhdWx0QXBpSG9zdCA9ICdodHRwczovLzFobXMtZGV2LWFwaS5uZXhlYWdsZS5jb20nO1xyXG4gIGNvbnN0IHJhd0FwaUJhc2VVcmwgPSBlbnYuVklURV9BUElfQkFTRV9VUkwgfHwgZGVmYXVsdEFwaUhvc3Q7XHJcbiAgY29uc3QgYXBpQmFzZVVybCA9IHJhd0FwaUJhc2VVcmwuc3RhcnRzV2l0aCgnaHR0cDovLycpIHx8IHJhd0FwaUJhc2VVcmwuc3RhcnRzV2l0aCgnaHR0cHM6Ly8nKVxyXG4gICAgPyByYXdBcGlCYXNlVXJsXHJcbiAgICA6IGBodHRwczovLyR7cmF3QXBpQmFzZVVybC5yZXBsYWNlKC9eXFwvXFwvLywgJycpfWA7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZVByb3h5Q29uZmlnID0gKHBhdGhSZXdyaXRlPzogKHBhdGg6IHN0cmluZykgPT4gc3RyaW5nKSA9PiAoe1xyXG4gICAgdGFyZ2V0OiBhcGlCYXNlVXJsLFxyXG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgc2VjdXJlOiBmYWxzZSxcclxuICAgIC4uLihwYXRoUmV3cml0ZSAmJiB7IHJld3JpdGU6IHBhdGhSZXdyaXRlIH0pLFxyXG4gICAgY29uZmlndXJlOiAocHJveHk6IGFueSwgX29wdGlvbnM6IGFueSkgPT4ge1xyXG4gICAgICBwcm94eS5vbignZXJyb3InLCAoZXJyOiBhbnksIF9yZXE6IGFueSwgX3JlczogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ3Byb3h5IGVycm9yJywgZXJyKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcTogYW55LCByZXE6IGFueSwgX3JlczogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1NlbmRpbmcgUmVxdWVzdCB0byB0aGUgVGFyZ2V0OicsIHJlcS5tZXRob2QsIHJlcS51cmwpO1xyXG4gICAgICB9KTtcclxuICAgICAgcHJveHkub24oJ3Byb3h5UmVzJywgKHByb3h5UmVzOiBhbnksIHJlcTogYW55LCBfcmVzOiBhbnkpID0+IHtcclxuICAgICAgICBjb25zb2xlLmxvZygnUmVjZWl2ZWQgUmVzcG9uc2UgZnJvbSB0aGUgVGFyZ2V0OicsIHByb3h5UmVzLnN0YXR1c0NvZGUsIHJlcS51cmwpO1xyXG4gICAgICB9KTtcclxuICAgIH0sXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBiYXNlOiAnLycsXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogXCI6OlwiLFxyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBjb3JzOiB0cnVlLFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgIC8vIENhdGNoLWFsbCBmb3IgYXhpb3NDbGllbnQncyBkZXYtbW9kZSBiYXNlVVJMIChzZWUgc3JjL3NlcnZpY2VzL2F4aW9zQ2xpZW50LnRzKSBcdTIwMTQgZXZlcnlcclxuICAgICAgICAvLyBBUElfRU5EUE9JTlRTIHBhdGggKG1vc3Qgd2l0aCBubyBsZWFkaW5nIHNsYXNoLCBlLmcuICdhdXRoL3VzZXIvbG9naW4nLCBidXQgc29tZSBsaWtlXHJcbiAgICAgICAgLy8gU1VCU0NSSVBUSU9OIGFscmVhZHkgZW1iZWRkaW5nICcvYXBpL3YxLy4uLicpIGxhbmRzIGhlcmUgYXMgL2Rldi1hcGkvPG9yaWdpbmFsIHBhdGg+LFxyXG4gICAgICAgIC8vIGdldHMgdGhlIC9kZXYtYXBpIHByZWZpeCBzdHJpcHBlZCwgYW5kIGZvcndhcmRzIHRvIGFwaUJhc2VVcmwgZXhhY3RseSBhcyB0aGUgb2xkXHJcbiAgICAgICAgLy8gYWJzb2x1dGUtVVJMIGF4aW9zIGJhc2VVUkwgdXNlZCB0byBoaXQgaXQgZGlyZWN0bHkuIE5lZWRlZCBiZWNhdXNlIHRoZSBkZXYgc2VydmVyIHNlcnZlc1xyXG4gICAgICAgIC8vIG92ZXIgSFRUUFMgKGJhc2ljU3NsLCByZXF1aXJlZCBlbHNld2hlcmUgZm9yIGNhbWVyYS9nZW9sb2NhdGlvbikgd2hpbGUgYXBpQmFzZVVybCBpc1xyXG4gICAgICAgIC8vIHBsYWluIEhUVFAgXHUyMDE0IGJyb3dzZXJzIGJsb2NrIHRoYXQgYXMgbWl4ZWQgY29udGVudCB3aGVuIGNhbGxlZCBkaXJlY3RseSBmcm9tIHRoZSBwYWdlLlxyXG4gICAgICAgICcvZGV2LWFwaSc6IGNyZWF0ZVByb3h5Q29uZmlnKChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9kZXYtYXBpLywgJycpKSxcclxuICAgICAgICAnL2FwaSc6IGNyZWF0ZVByb3h5Q29uZmlnKChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJykpLFxyXG4gICAgICAgICcvZG9jdG9ycyc6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9wcmVzY3JpcHRpb24nOiBjcmVhdGVQcm94eUNvbmZpZygpLFxyXG4gICAgICAgICcvYXV0aCc6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9hZG1pbic6IGNyZWF0ZVByb3h5Q29uZmlnKCksXHJcbiAgICAgICAgJy9wYXRpZW50LXByb2ZpbGUnOiBjcmVhdGVQcm94eUNvbmZpZygpLFxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgcHJldmlldzoge1xyXG4gICAgICBwb3J0OiAzMDAwLFxyXG4gICAgICBob3N0OiB0cnVlLFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgYmFzaWNTc2woKSxcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgVml0ZVBXQSh7XHJcbiAgICAgICAgcmVnaXN0ZXJUeXBlOiAnYXV0b1VwZGF0ZScsXHJcbiAgICAgICAgaW5qZWN0UmVnaXN0ZXI6IG51bGwsIC8vIHJlZ2lzdGVyZWQgbWFudWFsbHkgaW4gc3JjL29mZmxpbmUvcmVnaXN0ZXJTVy50c1xyXG4gICAgICAgIGRldk9wdGlvbnM6IHtcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICB0eXBlOiAnbW9kdWxlJyxcclxuICAgICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICdpbmRleC5odG1sJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdvcmtib3g6IHtcclxuICAgICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxpY28scG5nLHN2Zyx3b2ZmLHdvZmYyfSddLFxyXG4gICAgICAgICAgbmF2aWdhdGVGYWxsYmFjazogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIC8vIE5ldmVyIHNlcnZlIHRoZSBTUEEgc2hlbGwgZm9yIEFQSS9oZWFsdGggY2FsbHMuXHJcbiAgICAgICAgICBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvXlxcL2FwaS8sIC9eXFwvaGVhbHRoLywgL15cXC9hdXRoLywgL15cXC9kb2N0b3JzLywgL15cXC9wcmVzY3JpcHRpb24vLCAvXlxcL2FkbWluL10sXHJcbiAgICAgICAgICBjbGVhbnVwT3V0ZGF0ZWRDYWNoZXM6IHRydWUsXHJcbiAgICAgICAgICBjbGllbnRzQ2xhaW06IHRydWUsXHJcbiAgICAgICAgICBza2lwV2FpdGluZzogdHJ1ZSxcclxuICAgICAgICAgIC8vIERlbGliZXJhdGVseSBOT1QgY2FjaGluZyBBUEkgcmVzcG9uc2VzIGluIHRoZSBTVyBcdTIwMTQgUEhJIG9mZmxpbmUgcmVhZHMgYXJlIHNlcnZlZCBmcm9tIHRoZVxyXG4gICAgICAgICAgLy8gZW5jcnlwdGVkIEluZGV4ZWREQiBRdWVyeSBjYWNoZSwgc28gcGxhaW50ZXh0IFBISSBuZXZlciBsYW5kcyBpbiBDYWNoZSBTdG9yYWdlLlxyXG4gICAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5kZXN0aW5hdGlvbiA9PT0gJ2ZvbnQnLFxyXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcclxuICAgICAgICAgICAgICBvcHRpb25zOiB7IGNhY2hlTmFtZTogJ2ZvbnRzJywgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAzMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHVybFBhdHRlcm46ICh7IHJlcXVlc3QgfSkgPT4gcmVxdWVzdC5kZXN0aW5hdGlvbiA9PT0gJ2ltYWdlJyxcclxuICAgICAgICAgICAgICBoYW5kbGVyOiAnQ2FjaGVGaXJzdCcsXHJcbiAgICAgICAgICAgICAgb3B0aW9uczogeyBjYWNoZU5hbWU6ICdpbWFnZXMnLCBleHBpcmF0aW9uOiB7IG1heEVudHJpZXM6IDEyMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzAgfSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmlmZXN0OiB7XHJcbiAgICAgICAgICBuYW1lOiAnMUhNUycsXHJcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnMUhNUycsXHJcbiAgICAgICAgICBzdGFydF91cmw6ICcvJyxcclxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjZmZmZmZmJyxcclxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzRmNDZlNScsXHJcbiAgICAgICAgICBpY29uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAnTG9nby5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHNyYzogJ0xvZ28ucG5nJyxcclxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxyXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzcmM6ICdJbWFnZXMvNzc4MzRiYzYtZDliYy00MWQyLTg2NzYtMDI2YWY3Y2Y3OWJjLnBuZycsXHJcbiAgICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcclxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2UvcG5nJ1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3JjOiAnSW1hZ2VzLzc3ODM0YmM2LWQ5YmMtNDFkMi04Njc2LTAyNmFmN2NmNzliYy5wbmcnLFxyXG4gICAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3BuZydcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgXSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IHtcclxuICAgICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcclxuICAgICAgbWluaWZ5OiBtb2RlID09PSAncHJvZHVjdGlvbicgPyAndGVyc2VyJyA6IGZhbHNlLFxyXG4gICAgICB0ZXJzZXJPcHRpb25zOiBtb2RlID09PSAncHJvZHVjdGlvbicgPyB7XHJcbiAgICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICAgIGRyb3BfY29uc29sZTogZmFsc2UsXHJcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIG1hbmdsZToge1xyXG4gICAgICAgICAgc2FmYXJpMTA6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIH0gOiB1bmRlZmluZWQsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghYXNzZXRJbmZvLm5hbWUpIHJldHVybiBgYXNzZXRzL1tuYW1lXS1baGFzaF1bZXh0bmFtZV1gO1xyXG5cclxuICAgICAgICAgICAgaWYgKC9cXC4oY3NzKSQvLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKC9cXC4ocG5nfGpwZT9nfHN2Z3xnaWZ8dGlmZnxibXB8aWNvKSQvaS50ZXN0KGFzc2V0SW5mby5uYW1lKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBgYXNzZXRzL2ltYWdlcy9bbmFtZV0tW2hhc2hdW2V4dG5hbWVdYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoL1xcLih3b2ZmMj98ZW90fHR0ZnxvdGYpJC9pLnRlc3QoYXNzZXRJbmZvLm5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvZm9udHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGBhc3NldHMvW25hbWVdLVtoYXNoXVtleHRuYW1lXWA7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5qcycsXHJcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJ1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIG9wdGltaXplRGVwczoge1xyXG4gICAgICBpbmNsdWRlOiBbXHJcbiAgICAgICAgJ3JlYWN0JyxcclxuICAgICAgICAncmVhY3QtZG9tJyxcclxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXHJcbiAgICAgICAgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsXHJcbiAgICAgICAgJ3p1c3RhbmQnLFxyXG4gICAgICAgICdheGlvcycsXHJcbiAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXHJcbiAgICAgICAgJ0BmdWxsY2FsZW5kYXIvcmVhY3QnLFxyXG4gICAgICAgICdAZnVsbGNhbGVuZGFyL2RheWdyaWQnLFxyXG4gICAgICAgICdAZnVsbGNhbGVuZGFyL3RpbWVncmlkJyxcclxuICAgICAgICAnQGZ1bGxjYWxlbmRhci9pbnRlcmFjdGlvbicsXHJcbiAgICAgICAgJ3JlYWN0LWhvb2stZm9ybScsXHJcbiAgICAgICAgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLFxyXG4gICAgICAgICd6b2QnLFxyXG4gICAgICAgICdkYXRlLWZucycsXHJcbiAgICAgICAgJ2Nsc3gnLFxyXG4gICAgICAgICd0YWlsd2luZC1tZXJnZSdcclxuICAgICAgXSxcclxuICAgICAgZXhjbHVkZTogW11cclxuICAgIH0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgX19ERVZfXzogbW9kZSA9PT0gJ2RldmVsb3BtZW50J1xyXG4gICAgfVxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXNWLFNBQVMsY0FBYyxlQUFlO0FBQzVYLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsT0FBTyxjQUFjO0FBQ3JCLE9BQU8sVUFBVTtBQUpqQixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFDM0MsUUFBTSxpQkFBaUI7QUFDdkIsUUFBTSxnQkFBZ0IsSUFBSSxxQkFBcUI7QUFDL0MsUUFBTSxhQUFhLGNBQWMsV0FBVyxTQUFTLEtBQUssY0FBYyxXQUFXLFVBQVUsSUFDekYsZ0JBQ0EsV0FBVyxjQUFjLFFBQVEsU0FBUyxFQUFFLENBQUM7QUFFakQsUUFBTSxvQkFBb0IsQ0FBQyxpQkFBNEM7QUFB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
