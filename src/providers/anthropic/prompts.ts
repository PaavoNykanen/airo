import {
  STEERING_SYSTEM_PROMPT,
  buildSteeringUserPrompt,
} from "../../prompts/index.js";
import type { PackageReadme } from "../../packages.js";

/** Shared prompts by default — add anthropic-specific .md files here when needed. */
export function getSystemPrompt(): string {
  return STEERING_SYSTEM_PROMPT;
}

export function buildUserPrompt(pkg: PackageReadme, otherPackages: string[] = []): string {
  return buildSteeringUserPrompt(pkg, otherPackages);
}
