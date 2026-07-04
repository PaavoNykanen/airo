import type { PackageReadme } from "../packages.js";
import { generateSteeringForPackage as generateAnthropic } from "./anthropic/index.js";
import { generateSteeringForPackage as generateGoogle } from "./google/index.js";
import { generateSteeringForPackage as generateOpenAI } from "./openai/index.js";
import type { AIProvider } from "./types.js";

export {
  DEFAULT_API_KEY_ENV,
  PROVIDERS,
  getProviderDefinition,
  isAIProvider,
  type AIProvider,
  type AiConfig,
  type ModelTier,
  type ProviderDefinition,
} from "./types.js";
export { getProviderWizardOptions, promptAiConfig } from "./wizard.js";

/** Dispatch steering generation to the configured LLM provider. */
export async function generateSteeringForPackage(
  pkg: PackageReadme,
  provider: AIProvider,
  model: string,
  apiKey: string,
  otherPackages: string[] = [],
): Promise<string> {
  switch (provider) {
    case "anthropic":
      return generateAnthropic(pkg, model, apiKey, otherPackages);
    case "openai":
      return generateOpenAI(pkg, model, apiKey, otherPackages);
    case "google":
      return generateGoogle(pkg, model, apiKey, otherPackages);
    default:
      throw new Error(`Unsupported AI provider: ${String(provider)}`);
  }
}
