export type AIProvider = "anthropic" | "openai" | "google";

export type ModelTier = "fast" | "quality";

export interface AiConfig {
  provider: AIProvider;
  model: string;
  apiKeyEnv: string;
}

export interface ProviderDefinition {
  label: string;
  wizardHint: string;
  defaultApiKeyEnv: string;
  keyPlaceholder: string;
  models: Record<ModelTier, { label: string; hint: string; id: string }>;
}

/** Registry of supported LLM providers and their models. */
export const PROVIDERS: Record<AIProvider, ProviderDefinition> = {
  anthropic: {
    label: "Anthropic (Claude)",
    wizardHint: "Default",
    defaultApiKeyEnv: "ANTHROPIC_API_KEY",
    keyPlaceholder: "sk-ant-...",
    models: {
      fast: {
        label: "Haiku (recommended)",
        hint: "Fast and cost-effective",
        id: "claude-haiku-4-5-20251001",
      },
      quality: {
        label: "Sonnet",
        hint: "Higher quality, slower",
        id: "claude-sonnet-4-20250514",
      },
    },
  },
  openai: {
    label: "OpenAI",
    wizardHint: "GPT-4o models",
    defaultApiKeyEnv: "OPENAI_API_KEY",
    keyPlaceholder: "sk-...",
    models: {
      fast: {
        label: "GPT-4o mini (recommended)",
        hint: "Fast and cost-effective",
        id: "gpt-4o-mini",
      },
      quality: {
        label: "GPT-4o",
        hint: "Higher quality, slower",
        id: "gpt-4o",
      },
    },
  },
  google: {
    label: "Google (Gemini)",
    wizardHint: "Gemini Flash / Pro",
    defaultApiKeyEnv: "GEMINI_API_KEY",
    keyPlaceholder: "AIza...",
    models: {
      fast: {
        label: "Gemini 2.0 Flash (recommended)",
        hint: "Fast and cost-effective",
        id: "gemini-2.0-flash",
      },
      quality: {
        label: "Gemini 2.5 Pro",
        hint: "Higher quality, slower",
        id: "gemini-2.5-pro",
      },
    },
  },
};

export const DEFAULT_API_KEY_ENV = PROVIDERS.anthropic.defaultApiKeyEnv;

export function getProviderDefinition(provider: AIProvider): ProviderDefinition {
  return PROVIDERS[provider];
}

/** Type guard for validating provider ids from config or CLI input. */
export function isAIProvider(value: string): value is AIProvider {
  return value in PROVIDERS;
}
