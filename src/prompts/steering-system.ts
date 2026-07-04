import { loadPromptFile } from "./load-prompt.js";

/** Loaded once at startup from steering-system.md. */
export const STEERING_SYSTEM_PROMPT = loadPromptFile("steering-system.md");
