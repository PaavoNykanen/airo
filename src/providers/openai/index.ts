import OpenAI from "openai";
import type { PackageReadme } from "../../packages.js";
import { buildUserPrompt, getSystemPrompt } from "./prompts.js";

/** Call the OpenAI API to generate steering for one package. */
export async function generateSteeringForPackage(
  pkg: PackageReadme,
  model: string,
  apiKey: string,
  otherPackages: string[] = [],
): Promise<string> {
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: buildUserPrompt(pkg, otherPackages) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI API returned no text content");
  }

  return content.trim();
}
