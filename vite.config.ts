import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { clickToComponent } from "vite-plugin-react-click-to-component";

export default defineConfig({
  plugins: [react(), tailwindcss(), clickToComponent()],
  clearScreen: false,
  server: {
    port: 1421,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
