import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "src/renderer"),
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "dist/renderer"),
    emptyOutDir: true,
    commonjsOptions: {
      defaultIsModuleExports: true,
    },
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ["electron-log"],
  },
});
