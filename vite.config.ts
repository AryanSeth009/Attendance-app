import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8081,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy, options) => {
          proxy.on("error", (err) => {
            console.log("Proxy error:", err);
          });
          proxy.on("proxyReq", (proxyReq) => {
            console.log("Proxying request to:", options.target + proxyReq.path);
          });
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
});
