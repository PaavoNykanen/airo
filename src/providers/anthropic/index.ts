import Anthropic from "@anthropic-ai/sdk";
import type { PackageReadme } from "../../packages.js";
import { buildUserPrompt, getSystemPrompt } from "./prompts.js";

/** Call the Anthropic API to generate steering for one package. */
export async function generateSteeringForPackage(
  pkg: PackageReadme,
  model: string,
  apiKey: string,
  otherPackages: string[] = [],
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: getSystemPrompt(),
    messages: [{ role: "user", content: buildUserPrompt(pkg, otherPackages) }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic API returned no text content");
  }

  return textBlock.text.trim();
}
