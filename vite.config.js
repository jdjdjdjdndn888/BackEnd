import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    watch: {
      // Keep the file watcher count well under the container's inotify
      // limit — watching attached_assets/.cache/artifacts alongside a
      // large node_modules tree has repeatedly exhausted watchers
      // (ENOSPC) and crashed the dev server.
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.cache/**",
        "**/attached_assets/**",
        "**/artifacts/**",
        "**/.local/**",
        "**/.agents/**",
      ],
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/socket.io": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  assetsInclude: ["**/*.mov"],
  build: {
    chunkSizeWarningLimit: 1600,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  define: {
    global: "window",
    "process.env": {},
    "process.version": '"v18.0.0"',
  },
});
