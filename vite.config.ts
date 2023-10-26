import { resolve } from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "PrecacheStriping",
      fileName: "precache-striping",
      formats: ["cjs", "es", "umd", "iife"],
    },
    rollupOptions: {
      external: ["workbox-precaching", "workbox-routing"],
      output: {
        globals: {
          "workbox-precaching": "worboxPrecaching",
          "workbox-routing": "worboxRouting",
        },
      },
    },
  },
});
