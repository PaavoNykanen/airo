import { defineConfig } from "tsup";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node24",
  outDir: "dist",
  clean: true,
  dts: true,
  sourcemap: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  onSuccess: () => {
    mkdirSync("dist/prompts", { recursive: true });
    for (const file of readdirSync("src/prompts")) {
      if (file.endsWith(".md")) {
        copyFileSync(`src/prompts/${file}`, `dist/prompts/${file}`);
      }
    }
  },
});
