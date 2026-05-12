import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: projectRoot,
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
