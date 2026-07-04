import type { AiroConfig } from "../config.js";
import { STEERING_REL_PATH } from "../paths.js";
import { claudeTool } from "./claude/index.js";
import { cursorTool } from "./cursor/index.js";
import { kiroTool } from "./kiro/index.js";
import type { AITool, ToolDefinition } from "./types.js";

export { CURSOR_RULE_FILENAME } from "./cursor/index.js";
export type { AITool, ToolDefinition } from "./types.js";

const TOOLS: Record<AITool, ToolDefinition> = {
  kiro: kiroTool,
  claude: claudeTool,
  cursor: cursorTool,
};

/** Options for the AI tool multiselect in the setup wizard. */
export function getToolWizardOptions(): {
  value: AITool;
  label: string;
  hint: string;
}[] {
  return (Object.keys(TOOLS) as AITool[]).map((id) => ({
    value: id,
    label: TOOLS[id].label,
    hint: TOOLS[id].setupHint,
  }));
}

/** Detect which AI tools are present in the project directory. */
export function detectAITools(cwd: string = process.cwd()): AITool[] {
  return (Object.keys(TOOLS) as AITool[]).filter((id) => TOOLS[id].detect(cwd));
}

/** Wire .airo/steering.md into each selected AI tool's config. */
export async function injectReferences(
  cwd: string,
  tools: AITool[],
): Promise<void> {
  await Promise.all(
    tools.map((tool) => TOOLS[tool].injectReference(cwd, STEERING_REL_PATH)),
  );
}

/** Inject references for all tools listed in config. */
export async function updateToolReferences(
  cwd: string,
  config: AiroConfig,
): Promise<void> {
  await injectReferences(cwd, config.tools);
}
