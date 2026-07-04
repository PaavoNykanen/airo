import { GoogleGenAI } from "@google/genai";
import type { PackageReadme } from "../../packages.js";
import { buildUserPrompt, getSystemPrompt } from "./prompts.js";

/** Call the Google Gemini API to generate steering for one package. */
export async function generateSteeringForPackage(
  pkg: PackageReadme,
  model: string,
  apiKey: string,
  otherPackages: string[] = [],
): Promise<string> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model,
    contents: buildUserPrompt(pkg, otherPackages),
    config: {
      systemInstruction: getSystemPrompt(),
      maxOutputTokens: 4096,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Google Gemini API returned no text content");
  }

  return text.trim();
}
