import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Deliberately separate from vite.config.ts rather than merging into it: that file's
// defineConfig is a mode-dependent function wired for the dev server/build pipeline
// (HTTPS dev proxy, PWA service worker, terser, etc.) -- none of that applies to running
// tests, and merging risks the two configs fighting over `plugins`/`build`. Vitest only
// needs the same `@` alias so imports match what the app itself uses.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Default 'forks' pool spawns child processes, which timed out entirely in this
    // sandboxed environment ([vitest-pool-runner]: Timeout waiting for worker to respond).
    // 'threads' runs in-process worker threads instead -- no process-spawn permission needed.
    pool: "threads",
  },
});
