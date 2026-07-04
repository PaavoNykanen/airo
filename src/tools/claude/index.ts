import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { STEERING_REL_PATH } from "../../paths.js";
import type { ToolDefinition } from "../types.js";
async function injectReference(cwd: string, steeringRelativePath: string): Promise<void> {
  const claudePath = path.join(cwd, "CLAUDE.md");
  const claudeReference = `@${steeringRelativePath}`;

  if (!existsSync(claudePath)) {
    console.log(chalk.dim("Skipping CLAUDE.md reference (file not found)"));
    return;
  }

  const content = await readFile(claudePath, "utf-8");
  if (content.includes(claudeReference)) {
    console.log(chalk.dim(`CLAUDE.md already references ${steeringRelativePath}`));
    return;
  }

  const separator = content.endsWith("\n") ? "" : "\n";
  const updated = `${content}${separator}\n${claudeReference}\n`;
  await writeFile(claudePath, updated, "utf-8");
  console.log(chalk.green("✓ Added reference to CLAUDE.md"));
}

export const claudeTool: ToolDefinition = {
  label: "Claude Code",
  setupHint: "CLAUDE.md",
  detect(cwd) {
    return existsSync(path.join(cwd, "CLAUDE.md"));
  },
  injectReference,
};