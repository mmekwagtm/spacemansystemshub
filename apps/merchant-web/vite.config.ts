import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("@firebase/") || id.includes("/firebase/"))
            return "firebase";
          if (id.includes("@tanstack/react-query")) return "query";
          if (id.includes("react-dom") || id.includes("/react/"))
            return "react";
        },
      },
    },
  },
});
