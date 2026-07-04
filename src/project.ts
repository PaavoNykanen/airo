import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

/** Read and parse the project's package.json. Returns null if missing. */
export async function readProjectPackageJson(
  cwd: string = process.cwd(),
): Promise<Record<string, unknown> | null> {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const raw = await readFile(packageJsonPath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}
