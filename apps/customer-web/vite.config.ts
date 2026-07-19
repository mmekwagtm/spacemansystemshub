import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@spaceman/app-core": fileURLToPath(new URL("../../packages/app-core/src/index.ts", import.meta.url))
    }
  }
});
