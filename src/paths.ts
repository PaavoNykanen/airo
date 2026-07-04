import { mkdir } from "node:fs/promises";
import path from "node:path";

/** Directory in the project root where airo stores config and generated output. */
export const AIRO_DIR = ".airo";

export const CONFIG_FILENAME = "config.json";
export const STEERING_FILENAME = "steering.md";

/** Project-relative path used in Claude/Cursor references (always forward slashes). */
export const STEERING_REL_PATH = `${AIRO_DIR}/${STEERING_FILENAME}`;

/** Path to the .airo directory in a project. */
export function getAiroDir(cwd: string = process.cwd()): string {
  return path.join(cwd, AIRO_DIR);
}

/** Path to .airo/config.json. */
export function getConfigPath(cwd: string = process.cwd()): string {
  return path.join(getAiroDir(cwd), CONFIG_FILENAME);
}

/** Path to .airo/steering.md. */
export function getSteeringPath(cwd: string = process.cwd()): string {
  return path.join(getAiroDir(cwd), STEERING_FILENAME);
}

/** Create .airo/ if it does not exist. */
export async function ensureAiroDir(cwd: string = process.cwd()): Promise<string> {
  const dir = getAiroDir(cwd);
  await mkdir(dir, { recursive: true });
  return dir;
}
