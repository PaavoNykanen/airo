import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getProviderDefinition, PROVIDERS } from "../src/providers/types.js";

describe("PROVIDERS", () => {
  it("defines default API key env vars per provider", () => {
    assert.equal(PROVIDERS.anthropic.defaultApiKeyEnv, "ANTHROPIC_API_KEY");
    assert.equal(PROVIDERS.openai.defaultApiKeyEnv, "OPENAI_API_KEY");
    assert.equal(PROVIDERS.google.defaultApiKeyEnv, "GEMINI_API_KEY");
  });

  it("returns model ids for each tier", () => {
    const anthropic = getProviderDefinition("anthropic");
    assert.equal(anthropic.models.fast.id, "claude-haiku-4-5-20251001");
    assert.equal(anthropic.models.quality.id, "claude-sonnet-4-20250514");

    const openai = getProviderDefinition("openai");
    assert.equal(openai.models.fast.id, "gpt-4o-mini");

    const google = getProviderDefinition("google");
    assert.equal(google.models.fast.id, "gemini-2.0-flash");
  });
});
