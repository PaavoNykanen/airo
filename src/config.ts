import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";import {
  intro,
  outro,
  multiselect,
  isCancel,
  cancel,
  note,
} from "@clack/prompts";
import chalk from "chalk";
import { detectAITools, getToolWizardOptions, type AITool } from "./tools/index.js";
import {
  DEFAULT_API_KEY_ENV,
  PROVIDERS,
  type AIProvider,
  getProviderDefinition,
} from "./providers/types.js";
import { promptAiConfig } from "./providers/wizard.js";
import { CONFIG_FILENAME, ensureAiroDir, getConfigPath } from "./paths.js";

export { CONFIG_FILENAME } from "./paths.js";
export { getConfigPath } from "./paths.js";
export { DEFAULT_API_KEY_ENV };

const CONFIG_REL_PATH = `.airo/${CONFIG_FILENAME}`;

export const INSTALL_PACKAGES_REMINDER =
  "Remember to install all packages before running airo so that their README files are available.";

export interface AiroConfig {
  /** Output AI tools to wire up (Claude Code, Cursor, Kiro). */
  tools: AITool[];
  /** Dependency names or patterns to skip (supports trailing *). */
  ignore: string[];
  includeDevDependencies: boolean;
  ai: {
    provider: AIProvider;
    model: string;
    /** Env var name — the key itself is never stored in config. */
    apiKeyEnv: string;
  };
}

export const DEFAULT_CONFIG: AiroConfig = {
  tools: [],
  ignore: [
    "typescript",
    "eslint",
    "eslint-*",
    "prettier",
    "jest",
    "vitest",
    "@types/*",
    "tsup",
    "tsx",
  ],
  includeDevDependencies: false,
  ai: {
    provider: "anthropic",
    model: PROVIDERS.anthropic.models.fast.id,
    apiKeyEnv: PROVIDERS.anthropic.defaultApiKeyEnv,
  },
};

/** Read the API key from the env var named in config.ai.apiKeyEnv. */
export function resolveApiKey(config: AiroConfig): string | undefined {
  const value = process.env[config.ai.apiKeyEnv];
  return value?.trim() || undefined;
}

/** Instructions shown when the configured API key env var is missing. */
export function getApiKeySetupMessage(config: AiroConfig): string {
  const envName = config.ai.apiKeyEnv;
  const provider = getProviderDefinition(config.ai.provider);

  return [
    `Set ${envName} in your environment or .env file:`,
    "",
    `  ${envName}=${provider.keyPlaceholder}`,
    "",
    `Provider: ${provider.label}. airo reads the key from that variable — it is never stored in ${CONFIG_REL_PATH}.`,
    "",
    "Then run:",
    "",
    "  npx @paavonykanen/airo",
    "",
    "In CI, map a secret to the same variable name (e.g. GitHub Actions secrets).",
  ].join("\n");
}

/** Load config from disk, merged with defaults. Returns null if missing. */
export async function readConfig(cwd: string = process.cwd()): Promise<AiroConfig | null> {
  const configPath = getConfigPath(cwd);
  if (!existsSync(configPath)) {
    return null;
  }

  const raw = await readFile(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Partial<AiroConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    ai: { ...DEFAULT_CONFIG.ai, ...parsed.ai },
  };
}

/** Write config to .airo/config.json. */
export async function writeConfig(
  config: AiroConfig,
  cwd: string = process.cwd(),
): Promise<void> {
  await ensureAiroDir(cwd);
  const configPath = getConfigPath(cwd);
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8");
}

/** Interactive first-run wizard for tools, LLM provider, model, and API key env var. */
export async function runFirstRunWizard(cwd: string = process.cwd()): Promise<AiroConfig> {
  intro(chalk.bold("airo — first-run setup"));

  const detected = detectAITools(cwd);
  const defaultTools = detected.length > 0 ? detected : (["claude"] as AITool[]);

  const toolsSelection = await multiselect({
    message: "Which AI tools does this project use? (select all that apply)",
    options: getToolWizardOptions(),
    required: true,
    initialValues: defaultTools,
  });

  if (isCancel(toolsSelection)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const ai = await promptAiConfig();
  const providerDef = getProviderDefinition(ai.provider);

  note(
    [
      `Provider: ${providerDef.label}`,
      `airo reads your API key from ${ai.apiKeyEnv}.`,
      "Set its value in .env or your shell — the key itself is never saved to .airo/config.json.",
      "",
      INSTALL_PACKAGES_REMINDER,
    ].join("\n"),
    "Before generating",
  );

  const config: AiroConfig = {
    ...DEFAULT_CONFIG,
    tools: toolsSelection,
    ai,
  };

  await writeConfig(config, cwd);

  outro(chalk.green(`Config saved to ${CONFIG_REL_PATH}`));

  return config;
}

/** Load existing config or run the first-run wizard. */
export async function loadOrCreateConfig(cwd: string = process.cwd()): Promise<AiroConfig> {
  const existing = await readConfig(cwd);
  if (existing) {
    return existing;
  }
  return runFirstRunWizard(cwd);
}
