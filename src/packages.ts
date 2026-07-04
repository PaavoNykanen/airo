import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import type { AiroConfig } from "./config.js";
import { readProjectPackageJson } from "./project.js";

export interface PackageReadme {
  name: string;
  /** Resolved version from node_modules/package.json. */
  version: string | null;
  /** Semver range from the project's package.json. */
  requestedVersion: string | null;
  readme: string;
}

const MAX_README_CHARS = 8000;

/** Match exact names or prefix patterns ending in *. */
function matchesIgnorePattern(name: string, pattern: string): boolean {
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return name.startsWith(prefix);
  }
  return name === pattern;
}

/** True if the package name matches any ignore pattern in config. */
export function shouldIgnorePackage(name: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => matchesIgnorePattern(name, pattern));
}

/** All dependency names → semver ranges from package.json. */
export async function getProjectDependencyMap(
  cwd: string,
  config: AiroConfig,
): Promise<Record<string, string>> {
  const pkg = await readProjectPackageJson(cwd);
  if (!pkg) {
    return {};
  }

  const deps: Record<string, string> = {
    ...(pkg.dependencies as Record<string, string> | undefined),
  };

  if (config.includeDevDependencies) {
    Object.assign(deps, pkg.devDependencies as Record<string, string> | undefined);
  }

  return deps;
}

/** Sorted dependency names to process, after applying ignore rules. */
export async function getProjectDependencies(
  cwd: string,
  config: AiroConfig,
): Promise<string[]> {
  const deps = await getProjectDependencyMap(cwd, config);

  return Object.keys(deps)
    .filter((name) => !shouldIgnorePackage(name, config.ignore))
    .sort();
}

/** Read the installed version from node_modules/<pkg>/package.json. */
async function readInstalledVersion(cwd: string, packageName: string): Promise<string | null> {
  const packageJsonPath = path.join(cwd, "node_modules", packageName, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const raw = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    return null;
  }
}

/** Read README.md from node_modules. Returns null if missing. */
async function readReadmeFromNodeModules(
  cwd: string,
  packageName: string,
): Promise<string | null> {
  const readmePath = path.join(cwd, "node_modules", packageName, "README.md");
  if (!existsSync(readmePath)) {
    return null;
  }

  return readFile(readmePath, "utf-8");
}

/** Cap README length sent to the LLM. */
export function truncateReadme(readme: string, maxChars: number = MAX_README_CHARS): string {
  if (readme.length <= maxChars) {
    return readme;
  }
  return `${readme.slice(0, maxChars)}\n\n[... truncated ...]`;
}

/** Load README and version info for one package. Skips packages without a README. */
export async function fetchPackageReadme(
  cwd: string,
  packageName: string,
  requestedVersion: string | null = null,
): Promise<PackageReadme | null> {
  const readme = await readReadmeFromNodeModules(cwd, packageName);

  if (!readme) {
    console.warn(
      chalk.yellow(
        `⚠ Skipping ${packageName}: no README found in node_modules (is the package installed?)`,
      ),
    );
    return null;
  }

  return {
    name: packageName,
    version: await readInstalledVersion(cwd, packageName),
    requestedVersion,
    readme: truncateReadme(readme),
  };
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Regex to find and remove one package section in .airo/steering.md. */
export function buildPackageSectionPattern(packageName: string): RegExp {
  const escaped = escapeRegExp(packageName);
  return new RegExp(
    `^## (?:\\[${escaped}\\]|${escaped})(?: @ [^\\n]+)?(?:\\s|$)[\\s\\S]*?(?=^## |$)`,
    "gm",
  );
}

export interface SteeringPackageEntry {
  name: string;
  /** Installed version recorded in the section header, if present. */
  version: string | null;
}

/** Format a steering section header, optionally with installed version. */
export function formatPackageSectionHeader(
  packageName: string,
  version: string | null,
): string {
  if (version) {
    return `## [${packageName}] @ ${version}`;
  }
  return `## [${packageName}]`;
}

/** Normalize the LLM output header to include the installed version. */
export function stampPackageSectionVersion(
  section: string,
  packageName: string,
  version: string | null,
): string {
  const header = formatPackageSectionHeader(packageName, version);
  const lines = section.split("\n");

  if (lines[0]?.startsWith("## ")) {
    lines[0] = header;
    return lines.join("\n");
  }

  return `${header}\n\n${section.trim()}`;
}

/** Parse package names and stored versions from .airo/steering.md headers. */
export function parsePackagesFromSteering(content: string): SteeringPackageEntry[] {
  const entries: SteeringPackageEntry[] = [];

  for (const line of content.split("\n")) {
    const bracketed = line.match(/^## \[([^\]]+)\](?: @ ([^\n]+))?\s*$/);
    if (bracketed) {
      entries.push({
        name: bracketed[1].trim(),
        version: bracketed[2]?.trim() ?? null,
      });
      continue;
    }

    const unbracketedVersioned = line.match(/^## ([^\n\[]+) @ ([^\n]+)\s*$/);
    if (unbracketedVersioned) {
      entries.push({
        name: unbracketedVersioned[1].trim(),
        version: unbracketedVersioned[2].trim(),
      });
      continue;
    }

    const unbracketed = line.match(/^## ([^\n\[]+)\s*$/);
    if (unbracketed) {
      entries.push({ name: unbracketed[1].trim(), version: null });
    }
  }

  return entries;
}

/** Read installed versions from node_modules for a list of package names. */
export async function getInstalledVersions(
  cwd: string,
  packageNames: string[],
): Promise<Map<string, string | null>> {
  const versions = new Map<string, string | null>();
  for (const name of packageNames) {
    versions.set(name, await readInstalledVersion(cwd, name));
  }
  return versions;
}

/** Remove steering sections for the given package names. */
export function removeSectionsForPackages(content: string, packageNames: string[]): string {
  let result = content;
  for (const name of packageNames) {
    result = result.replace(buildPackageSectionPattern(name), "");
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/** Compare current deps against packages already present in steering output. */
export function diffPackages(
  current: string[],
  previouslyProcessed: string[],
): { added: string[]; removed: string[]; unchanged: string[] } {
  const previousSet = new Set(previouslyProcessed);
  const currentSet = new Set(current);

  const added = current.filter((name) => !previousSet.has(name));
  const removed = previouslyProcessed.filter((name) => !currentSet.has(name));
  const unchanged = current.filter((name) => previousSet.has(name));

  return { added, removed, unchanged };
}

/**
 * Decide which packages need LLM generation on an incremental run.
 * Includes newly added deps and packages whose installed version changed.
 */
export async function resolvePackagesToProcess(
  cwd: string,
  config: AiroConfig,
  steeringPath: string,
): Promise<{ packages: string[]; isIncremental: boolean; removed: string[] }> {
  const allDeps = await getProjectDependencies(cwd, config);

  if (!existsSync(steeringPath)) {
    return { packages: allDeps, isIncremental: false, removed: [] };
  }

  const existing = await readFile(steeringPath, "utf-8");
  const previousEntries = parsePackagesFromSteering(existing);
  const previousNames = previousEntries.map((entry) => entry.name);
  const previousVersions = new Map(previousEntries.map((entry) => [entry.name, entry.version]));
  const { added, removed } = diffPackages(allDeps, previousNames);
  const installedVersions = await getInstalledVersions(cwd, allDeps);

  const versionUpdated = allDeps.filter((name) => {
    if (added.includes(name)) {
      return false;
    }

    const storedVersion = previousVersions.get(name);
    if (storedVersion === undefined || storedVersion === null) {
      return false;
    }

    const installedVersion = installedVersions.get(name);
    if (!installedVersion) {
      return false;
    }

    return storedVersion !== installedVersion;
  });

  if (removed.length > 0) {
    console.log(
      chalk.dim(`Removing steering for ${removed.length} uninstalled package(s)`),
    );
  }

  if (versionUpdated.length > 0) {
    console.log(
      chalk.dim(
        `Regenerating ${versionUpdated.length} package(s) with updated installed version(s)`,
      ),
    );
  }

  const packages = [...new Set([...added, ...versionUpdated])];
  return { packages, isIncremental: true, removed };
}

/** Load READMEs for a batch of package names. */
export async function fetchReadmesForPackages(
  cwd: string,
  packageNames: string[],
  config: AiroConfig,
): Promise<PackageReadme[]> {
  const dependencyVersions = await getProjectDependencyMap(cwd, config);
  const results: PackageReadme[] = [];

  for (const name of packageNames) {
    const pkg = await fetchPackageReadme(cwd, name, dependencyVersions[name] ?? null);
    if (pkg) {
      results.push(pkg);
    }
  }

  return results;
}

/** Split a list into fixed-size chunks (reserved for future batching). */
export function batchPackages<T>(items: T[], batchSize: number = 10): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}
