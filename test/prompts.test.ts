import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { STEERING_SYSTEM_PROMPT } from "../src/prompts/steering-system.js";
import {
  buildSteeringUserPrompt,
  formatOtherPackagesContext,
} from "../src/prompts/steering-user.js";

describe("prompts", () => {
  it("loads steering system prompt from markdown", () => {
    assert.match(STEERING_SYSTEM_PROMPT, /## \[package-name\]/);
    assert.match(STEERING_SYSTEM_PROMPT, /brackets required/);
    assert.match(STEERING_SYSTEM_PROMPT, /Only mention other installed packages/);
  });

  it("builds user prompt with package readmes, ranges, and installed versions", () => {
    const prompt = buildSteeringUserPrompt({
      name: "react",
      version: "18.3.1",
      requestedVersion: "^18.0.0",
      readme: "# React\n\nUI library.",
    });

    assert.match(prompt, /Generate steering sections/);
    assert.match(prompt, /### Package: react/);
    assert.match(prompt, /package\.json range: \^18\.0\.0/);
    assert.match(prompt, /Installed version: 18\.3\.1/);
    assert.match(prompt, /scope all guidance to this version only/);
    assert.match(prompt, /UI library/);
  });

  it("includes other project packages for disambiguation", () => {
    const prompt = buildSteeringUserPrompt(
      {
        name: "@anthropic-ai/sdk",
        version: "0.52.0",
        requestedVersion: "^0.52.0",
        readme: "# Anthropic SDK\n",
      },
      ["openai", "@google/genai"],
    );

    assert.match(prompt, /Other packages installed in this project: openai, @google\/genai/);
    assert.match(prompt, /could plausibly be confused with or used instead of the target package/);
    assert.match(prompt, /do not mention any of them/);
    assert.doesNotMatch(prompt, /- @anthropic-ai\/sdk/);
  });

  it("omits other-packages section when none provided", () => {
    const context = formatOtherPackagesContext([]);
    assert.equal(context, "");
  });
});
