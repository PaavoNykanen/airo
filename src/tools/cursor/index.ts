import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import type { ToolDefinition } from "../types.js";

export const CURSOR_RULE_FILENAME = "airo-steering.mdc";

/** Create .cursor/rules/airo-steering.mdc that includes .airo/steering.md. */
async function injectReference(cwd: string, steeringRelativePath: string): Promise<void> {
  const rulesDir = path.join(cwd, ".cursor", "rules");
  const rulePath = path.join(rulesDir, CURSOR_RULE_FILENAME);

  await mkdir(rulesDir, { recursive: true });

  if (existsSync(rulePath)) {
    console.log(chalk.dim(`.cursor/rules/${CURSOR_RULE_FILENAME} already exists`));
    return;
  }

  const content = `---
description: Auto-generated package steering from airo
globs:
alwaysApply: true
---

@include ../../${steeringRelativePath}
`;

  await writeFile(rulePath, content, "utf-8");
  console.log(chalk.green(`✓ Created .cursor/rules/${CURSOR_RULE_FILENAME}`));
}

export const cursorTool: ToolDefinition = {
  label: "Cursor",
  setupHint: ".cursor/ or .cursorrules",
  detect(cwd) {
    return (
      existsSync(path.join(cwd, ".cursor")) || existsSync(path.join(cwd, ".cursorrules"))
    );
  },
  injectReference,
};
