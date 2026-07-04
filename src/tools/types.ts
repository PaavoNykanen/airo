/** Supported output AI tools that consume .airo/steering.md. */
export type AITool = "kiro" | "claude" | "cursor";

export interface ToolDefinition {
  label: string;
  setupHint: string;
  /** Return true if this tool's project markers exist on disk. */
  detect: (cwd: string) => boolean;
  /** Wire .airo/steering.md into the tool's config (CLAUDE.md, .cursor/rules, etc.). */
  injectReference: (cwd: string, steeringRelativePath: string) => Promise<void>;
}
