import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** Resolve prompts dir — src/prompts in dev, dist/prompts when bundled. */
function resolvePromptsDir(): string {
  const baseDir = path.dirname(fileURLToPath(import.meta.url));

  const localDir = baseDir;
  if (existsSync(path.join(localDir, "steering-system.md"))) {
    return localDir;
  }

  const bundledDir = path.join(baseDir, "prompts");
  if (existsSync(path.join(bundledDir, "steering-system.md"))) {
    return bundledDir;
  }

  throw new Error("Prompt files not found. Expected steering-system.md in prompts directory.");
}

const PROMPTS_DIR = resolvePromptsDir();

/** Load a markdown prompt file from the prompts directory. */
export function loadPromptFile(filename: string): string {
  return readFileSync(path.join(PROMPTS_DIR, filename), "utf-8").trim();
}
