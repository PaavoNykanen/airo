import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { STEERING_REL_PATH } from "../src/paths.js";
import { getSteeringPath, writeSteeringFile } from "../src/write.js";
import { CURSOR_RULE_FILENAME, injectReferences } from "../src/tools/index.js";
import { createTempProject } from "./helpers/temp-project.js";

describe("writeSteeringFile", () => {
  it("writes .airo/steering.md", async () => {
    const { dir, cleanup } = await createTempProject({});
    try {
      await writeSteeringFile(dir, "# test content\n");
      const content = await readFile(getSteeringPath(dir), "utf-8");
      assert.equal(content, "# test content\n");
    } finally {
      await cleanup();
    }
  });
});

describe("injectReferences", () => {
  it("appends @.airo/steering.md to CLAUDE.md", async () => {
    const { dir, cleanup } = await createTempProject({
      "CLAUDE.md": "# Project instructions\n",
    });

    try {
      await injectReferences(dir, ["claude"]);
      const content = await readFile(path.join(dir, "CLAUDE.md"), "utf-8");
      assert.match(content, /@\.airo\/steering\.md/);
    } finally {
      await cleanup();
    }
  });

  it("does not duplicate CLAUDE.md reference", async () => {
    const { dir, cleanup } = await createTempProject({
      "CLAUDE.md": `# Project\n\n@${STEERING_REL_PATH}\n`,
    });

    try {
      await injectReferences(dir, ["claude"]);
      const content = await readFile(path.join(dir, "CLAUDE.md"), "utf-8");
      assert.equal(content.match(/@\.airo\/steering\.md/g)?.length, 1);
    } finally {
      await cleanup();
    }
  });

  it("creates cursor rule file", async () => {
    const { dir, cleanup } = await createTempProject({});
    try {
      await injectReferences(dir, ["cursor"]);
      const rulePath = path.join(dir, ".cursor", "rules", CURSOR_RULE_FILENAME);
      const content = await readFile(rulePath, "utf-8");
      assert.match(content, /\.airo\/steering\.md/);
    } finally {
      await cleanup();
    }
  });

  it("creates kiro steering reference when .kiro exists", async () => {
    const { dir, cleanup } = await createTempProject({
      ".kiro/config": "{}",
      [STEERING_REL_PATH]: "# steering\n",
    });

    try {
      await injectReferences(dir, ["kiro"]);
      const linkPath = path.join(dir, ".kiro", "steering", "steering.md");
      const content = await readFile(linkPath, "utf-8");
      assert.ok(content.length > 0);
    } finally {
      await cleanup();
    }
  });
});
