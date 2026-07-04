import { writeFile } from "node:fs/promises";
import chalk from "chalk";
import {
  STEERING_REL_PATH,
  ensureAiroDir,
  getSteeringPath,
} from "./paths.js";

export {
  STEERING_FILENAME,
  STEERING_REL_PATH,
  getSteeringPath,
} from "./paths.js";

/** Write the steering document to .airo/steering.md. */
export async function writeSteeringFile(
  cwd: string,
  content: string,
): Promise<void> {
  await ensureAiroDir(cwd);
  const steeringPath = getSteeringPath(cwd);
  await writeFile(steeringPath, content, "utf-8");
  console.log(chalk.green(`✓ Wrote ${STEERING_REL_PATH}`));
}
