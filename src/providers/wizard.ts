import { cancel, isCancel, select, text } from "@clack/prompts";
import {
  PROVIDERS,
  type AIProvider,
  type AiConfig,
  type ModelTier,
  getProviderDefinition,
} from "./types.js";
/** Options for the LLM provider select in the setup wizard. */
export function getProviderWizardOptions(): {
  value: AIProvider;
  label: string;
  hint: string;
}[] {
  return (Object.keys(PROVIDERS) as AIProvider[]).map((id) => ({
    value: id,
    label: PROVIDERS[id].label,
    hint: PROVIDERS[id].wizardHint,
  }));
}

/** Prompt for LLM provider, model tier, and API key env var during setup. */
export async function promptAiConfig(): Promise<AiConfig> {
  const providerChoice = await select({
    message: "LLM provider for generating steering",
    options: getProviderWizardOptions(),
    initialValue: "anthropic",
  });

  if (isCancel(providerChoice)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const provider = providerChoice as AIProvider;
  const providerDef = getProviderDefinition(provider);

  const modelChoice = await select({
    message: "Preferred model",
    options: [
      {
        value: "fast" as const,
        label: providerDef.models.fast.label,
        hint: providerDef.models.fast.hint,
      },
      {
        value: "quality" as const,
        label: providerDef.models.quality.label,
        hint: providerDef.models.quality.hint,
      },
    ],
    initialValue: "fast",
  });

  if (isCancel(modelChoice)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const apiKeyEnvInput = await text({
    message: `Environment variable for your ${providerDef.label} API key`,
    placeholder: providerDef.defaultApiKeyEnv,
    defaultValue: providerDef.defaultApiKeyEnv,
    validate(value) {
      if (!value.trim()) {
        return "Variable name is required";
      }
      if (!/^[A-Z][A-Z0-9_]*$/.test(value.trim())) {
        return "Use UPPER_SNAKE_CASE (e.g. ANTHROPIC_API_KEY)";
      }
    },
  });

  if (isCancel(apiKeyEnvInput)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const chosenTier = modelChoice as ModelTier;

  return {
    provider,
    model: providerDef.models[chosenTier].id,
    apiKeyEnv: apiKeyEnvInput.trim(),
  };
}
