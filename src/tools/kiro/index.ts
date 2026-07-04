import { existsSync } from "node:fs";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { STEERING_FILENAME } from "../../paths.js";
import type { ToolDefinition } from "../types.js";

/** Symlink .airo/steering.md into .kiro/steering/ (falls back to a pointer file on Windows). */
async function injectReference(cwd: string, steeringRelativePath: string): Promise<void> {
  const steeringDir = path.join(cwd, ".kiro", "steering");
  const linkPath = path.join(steeringDir, STEERING_FILENAME);
  const targetPath = path.join(cwd, steeringRelativePath);

  if (!existsSync(path.join(cwd, ".kiro"))) {
    console.log(chalk.dim("Skipping .kiro/steering/ reference (.kiro/ not found)"));
    return;
  }

  await mkdir(steeringDir, { recursive: true });

  if (existsSync(linkPath)) {
    console.log(chalk.dim(`.kiro/steering/${STEERING_FILENAME} already exists`));
    return;
  }

  try {
    await symlink(path.relative(steeringDir, targetPath), linkPath);
    console.log(chalk.green("✓ Created symlink in .kiro/steering/"));
  } catch {
    await writeFile(
      linkPath,
      `# Package steering\n\nSee \`${steeringRelativePath}\` in the project.\n`,
      "utf-8",
    );
    console.log(chalk.green("✓ Created reference file in .kiro/steering/"));
  }
}

export const kiroTool: ToolDefinition = {
  label: "Kiro",
  setupHint: ".kiro/ directory",
  detect(cwd) {
    return existsSync(path.join(cwd, ".kiro"));
  },
  injectReference,
};
