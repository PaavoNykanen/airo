import type { PackageReadme } from "../packages.js";
import { loadPromptFile } from "./load-prompt.js";

const USER_INTRO = loadPromptFile("steering-user-intro.md");

/** Build version context lines included above each package README in the user prompt. */
function formatVersionContext(pkg: PackageReadme): string {
  const lines: string[] = [];

  if (pkg.requestedVersion) {
    lines.push(`package.json range: ${pkg.requestedVersion}`);
  }

  if (pkg.version) {
    lines.push(
      `Installed version: ${pkg.version} (scope all guidance to this version only)`,
    );
  } else {
    lines.push(
      "Installed version: unknown (use only APIs likely present in the installed copy)",
    );
  }

  return `\n\n${lines.join("\n")}`;
}

/** List other project dependencies so the model can disambiguate overlapping packages. */
export function formatOtherPackagesContext(otherPackages: string[]): string {
  if (otherPackages.length === 0) {
    return "";
  }

  const list = otherPackages.join(", ");
  return `\n\nOther packages installed in this project: ${list}\n\nOnly reference another installed package if it could plausibly be confused with or used instead of the target package for the same task (e.g. multiple AI provider SDKs, multiple CLI prompt libraries, multiple styling libraries). If no installed package has meaningful overlap with the target package's purpose, do not mention any of them — most packages serve distinct purposes and should not reference siblings at all.`;
}

/** Assemble the user prompt for a single target package. */
export function buildSteeringUserPrompt(
  pkg: PackageReadme,
  otherPackages: string[] = [],
): string {
  const section = `### Package: ${pkg.name}${formatVersionContext(pkg)}${formatOtherPackagesContext(otherPackages)}\n\n${pkg.readme}`;
  return `${USER_INTRO}\n\n${section}`;
}
