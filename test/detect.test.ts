import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectAITools } from "../src/tools/index.js";
import { createTempProject } from "./helpers/temp-project.js";

describe("detectAITools", () => {
  it("detects kiro, claude, and cursor markers", async () => {
    const { dir, cleanup } = await createTempProject({
      ".kiro/config": "",
      "CLAUDE.md": "# Claude",
      ".cursor/settings.json": "{}",
    });
    try {
      assert.deepEqual(detectAITools(dir), ["kiro", "claude", "cursor"]);
    } finally {
      await cleanup();
    }
  });

  it("detects cursor from .cursorrules", async () => {
    const { dir, cleanup } = await createTempProject({
      ".cursorrules": "use typescript",
    });
    try {
      assert.deepEqual(detectAITools(dir), ["cursor"]);
    } finally {
      await cleanup();
    }
  });

  it("returns empty array when no tools found", async () => {
    const { dir, cleanup } = await createTempProject({});
    try {
      assert.deepEqual(detectAITools(dir), []);
    } finally {
      await cleanup();
    }
  });
});
