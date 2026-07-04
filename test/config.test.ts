import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIG_FILENAME,
  DEFAULT_API_KEY_ENV,
  DEFAULT_CONFIG,
  getConfigPath,
  readConfig,
  resolveApiKey,
  writeConfig,
} from "../src/config.js";
import type { AITool } from "../src/tools/index.js";
import { createTempProject } from "./helpers/temp-project.js";

describe("config", () => {
  it("returns null when config file is missing", async () => {
    const { dir, cleanup } = await createTempProject({});
    try {
      assert.equal(await readConfig(dir), null);
    } finally {
      await cleanup();
    }
  });

  it("reads config merged with defaults", async () => {
    const { dir, cleanup } = await createTempProject({
      [`.airo/${CONFIG_FILENAME}`]: JSON.stringify({
        tools: ["cursor"],
        ai: { model: "claude-sonnet-4-20250514" },
      }),
    });

    try {
      const config = await readConfig(dir);
      assert.ok(config);
      assert.deepEqual(config.tools, ["cursor"]);
      assert.equal(config.ai.model, "claude-sonnet-4-20250514");
      assert.deepEqual(config.ignore, DEFAULT_CONFIG.ignore);
      assert.equal(config.ai.apiKeyEnv, DEFAULT_API_KEY_ENV);
    } finally {
      await cleanup();
    }
  });

  it("writes config to .airo/config.json", async () => {
    const { dir, cleanup } = await createTempProject({});
    try {
      const config = {
        ...DEFAULT_CONFIG,
        tools: ["claude", "kiro"] as AITool[],
      };

      await writeConfig(config, dir);
      assert.match(getConfigPath(dir), /\.airo[\\/]config\.json$/);

      const read = await readConfig(dir);
      assert.deepEqual(read?.tools, ["claude", "kiro"]);
    } finally {
      await cleanup();
    }
  });
});

describe("resolveApiKey", () => {
  it("reads the API key from the configured env var", () => {
    const config = { ...DEFAULT_CONFIG, ai: { ...DEFAULT_CONFIG.ai, apiKeyEnv: "MY_KEY" } };
    process.env.MY_KEY = "sk-ant-test";
    try {
      assert.equal(resolveApiKey(config), "sk-ant-test");
    } finally {
      delete process.env.MY_KEY;
    }
  });

  it("returns undefined when env var is missing", () => {
    const config = { ...DEFAULT_CONFIG, ai: { ...DEFAULT_CONFIG.ai, apiKeyEnv: "MISSING_KEY" } };
    delete process.env.MISSING_KEY;
    assert.equal(resolveApiKey(config), undefined);
  });
});
