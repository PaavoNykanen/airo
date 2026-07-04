import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../src/config.js";
import {
  batchPackages,
  diffPackages,
  fetchPackageReadme,
  getProjectDependencies,
  parsePackagesFromSteering,
  resolvePackagesToProcess,
  shouldIgnorePackage,
  stampPackageSectionVersion,
  truncateReadme,
} from "../src/packages.js";
import { getSteeringPath } from "../src/write.js";
import { createTempProject } from "./helpers/temp-project.js";

describe("shouldIgnorePackage", () => {
  it("matches exact names", () => {
    assert.equal(shouldIgnorePackage("typescript", ["typescript"]), true);
    assert.equal(shouldIgnorePackage("react", ["typescript"]), false);
  });

  it("matches wildcard prefixes", () => {
    assert.equal(shouldIgnorePackage("@types/node", ["@types/*"]), true);
    assert.equal(shouldIgnorePackage("eslint-config-prettier", ["eslint-*"]), true);
    assert.equal(shouldIgnorePackage("my-eslint", ["eslint-*"]), false);
  });
});

describe("truncateReadme", () => {
  it("leaves short readmes unchanged", () => {
    assert.equal(truncateReadme("hello"), "hello");
  });

  it("truncates long readmes", () => {
    const long = "x".repeat(9000);
    const result = truncateReadme(long, 100);
    assert.equal(result.length, 100 + "\n\n[... truncated ...]".length);
    assert.match(result, /\[\.\.\. truncated \.\.\.\]$/);
  });
});

describe("parsePackagesFromSteering", () => {
  it("extracts package names from section headers", () => {
    const content = `# header

## [react]
- use hooks

## [lodash]
- utility helpers
`;
    assert.deepEqual(parsePackagesFromSteering(content), [
      { name: "react", version: null },
      { name: "lodash", version: null },
    ]);
  });

  it("extracts names and installed versions from versioned headers", () => {
    const content = `## [react] @ 19.0.0
- use hooks

## [@types/node] @ 22.15.21
- node types
`;
    assert.deepEqual(parsePackagesFromSteering(content), [
      { name: "react", version: "19.0.0" },
      { name: "@types/node", version: "22.15.21" },
    ]);
  });

  it("extracts names from unbracketed headers", () => {
    const content = `## openai @ 5.0.0
- use the SDK

## [@anthropic-ai/sdk]
- call messages.create
`;
    assert.deepEqual(parsePackagesFromSteering(content), [
      { name: "openai", version: "5.0.0" },
      { name: "@anthropic-ai/sdk", version: null },
    ]);
  });
});

describe("stampPackageSectionVersion", () => {
  it("adds installed version to the section header", () => {
    const section = "## [react]\n- use hooks\n";
    const stamped = stampPackageSectionVersion(section, "react", "19.0.0");
    assert.match(stamped, /^## \[react\] @ 19\.0\.0/);
    assert.match(stamped, /use hooks/);
  });

  it("replaces an existing version in the header", () => {
    const section = "## [react] @ 18.3.1\n- use hooks\n";
    const stamped = stampPackageSectionVersion(section, "react", "19.0.0");
    assert.match(stamped, /^## \[react\] @ 19\.0\.0/);
    assert.doesNotMatch(stamped, /18\.3\.1/);
  });

  it("normalizes unbracketed LLM headers without leaving a name suffix", () => {
    const section = "## chalk\n- use for terminal colors\n";
    const stamped = stampPackageSectionVersion(section, "chalk", "5.6.2");
    assert.equal(stamped.split("\n")[0], "## [chalk] @ 5.6.2");
    assert.doesNotMatch(stamped, /5\.6\.2halk/);
  });

  it("normalizes unbracketed scoped package headers", () => {
    const section = "## @anthropic-ai/sdk\n- use for Claude API\n";
    const stamped = stampPackageSectionVersion(section, "@anthropic-ai/sdk", "0.52.0");
    assert.equal(stamped.split("\n")[0], "## [@anthropic-ai/sdk] @ 0.52.0");
    assert.doesNotMatch(stamped, /0\.52\.0anthropic/);
  });
});

describe("diffPackages", () => {
  it("computes added, removed, and unchanged packages", () => {
    const result = diffPackages(
      ["react", "zod"],
      ["react", "lodash"],
    );

    assert.deepEqual(result.added, ["zod"]);
    assert.deepEqual(result.removed, ["lodash"]);
    assert.deepEqual(result.unchanged, ["react"]);
  });
});

describe("batchPackages", () => {
  it("splits items into fixed-size batches", () => {
    assert.deepEqual(batchPackages([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(batchPackages([], 10), []);
  });
});

describe("getProjectDependencies", () => {
  it("reads production dependencies and applies ignore list", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: {
          react: "^19.0.0",
          typescript: "^5.0.0",
          "@types/node": "^22.0.0",
        },
        devDependencies: {
          vitest: "^3.0.0",
        },
      }),
    });

    try {
      const deps = await getProjectDependencies(dir, DEFAULT_CONFIG);
      assert.deepEqual(deps, ["react"]);
    } finally {
      await cleanup();
    }
  });

  it("includes devDependencies when configured", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0" },
        devDependencies: { vitest: "^3.0.0" },
      }),
    });

    try {
      const deps = await getProjectDependencies(dir, {
        ...DEFAULT_CONFIG,
        includeDevDependencies: true,
      });
      assert.deepEqual(deps, ["react"]);
    } finally {
      await cleanup();
    }
  });
});

describe("resolvePackagesToProcess", () => {
  it("returns all deps on first run", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0", zod: "^3.0.0" },
      }),
    });

    try {
      const result = await resolvePackagesToProcess(
        dir,
        DEFAULT_CONFIG,
        getSteeringPath(dir),
      );

      assert.equal(result.isIncremental, false);
      assert.deepEqual(result.packages, ["react", "zod"]);
      assert.deepEqual(result.removed, []);
    } finally {
      await cleanup();
    }
  });

  it("returns only added packages on incremental run", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0", zod: "^3.0.0" },
      }),
      ".airo/steering.md": `# airo — package steering
> Auto-generated

## [react]
- existing section
`,
    });

    try {
      const result = await resolvePackagesToProcess(
        dir,
        DEFAULT_CONFIG,
        getSteeringPath(dir),
      );

      assert.equal(result.isIncremental, true);
      assert.deepEqual(result.packages, ["zod"]);
      assert.deepEqual(result.removed, []);
    } finally {
      await cleanup();
    }
  });

  it("reports removed packages", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0" },
      }),
      ".airo/steering.md": `# airo — package steering
> Auto-generated

## [react] @ 19.0.0
- existing

## [lodash] @ 4.17.21
- old package
`,
    });

    try {
      const result = await resolvePackagesToProcess(
        dir,
        DEFAULT_CONFIG,
        getSteeringPath(dir),
      );

      assert.deepEqual(result.packages, []);
      assert.deepEqual(result.removed, ["lodash"]);
    } finally {
      await cleanup();
    }
  });

  it("regenerates packages whose installed version changed", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0", zod: "^3.0.0" },
      }),
      "node_modules/react/package.json": JSON.stringify({ name: "react", version: "19.1.0" }),
      "node_modules/zod/package.json": JSON.stringify({ name: "zod", version: "3.24.0" }),
      ".airo/steering.md": `# airo — package steering
> Auto-generated

## [react] @ 19.0.0
- old react guidance

## [zod] @ 3.24.0
- current zod guidance
`,
    });

    try {
      const result = await resolvePackagesToProcess(
        dir,
        DEFAULT_CONFIG,
        getSteeringPath(dir),
      );

      assert.equal(result.isIncremental, true);
      assert.deepEqual(result.packages, ["react"]);
      assert.deepEqual(result.removed, []);
    } finally {
      await cleanup();
    }
  });

  it("ignores legacy headers without a stored version", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { react: "^19.0.0" },
      }),
      "node_modules/react/package.json": JSON.stringify({ name: "react", version: "19.1.0" }),
      ".airo/steering.md": `# airo — package steering
> Auto-generated

## [react]
- legacy header without version
`,
    });

    try {
      const result = await resolvePackagesToProcess(
        dir,
        DEFAULT_CONFIG,
        getSteeringPath(dir),
      );

      assert.deepEqual(result.packages, []);
      assert.deepEqual(result.removed, []);
    } finally {
      await cleanup();
    }
  });
});

describe("fetchPackageReadme", () => {
  it("reads README, installed version, and package.json range", async () => {
    const { dir, cleanup } = await createTempProject({
      "package.json": JSON.stringify({
        dependencies: { "my-lib": "^2.0.0" },
      }),
      "node_modules/my-lib/package.json": JSON.stringify({ name: "my-lib", version: "2.3.4" }),
      "node_modules/my-lib/README.md": "# My Lib\n\nUseful library.",
    });

    try {
      const result = await fetchPackageReadme(dir, "my-lib", "^2.0.0");
      assert.ok(result);
      assert.equal(result.name, "my-lib");
      assert.equal(result.version, "2.3.4");
      assert.equal(result.requestedVersion, "^2.0.0");
      assert.match(result.readme, /Useful library/);
    } finally {
      await cleanup();
    }
  });

  it("returns null when README is missing", async () => {
    const { dir, cleanup } = await createTempProject({});
    try {
      const result = await fetchPackageReadme(dir, "nonexistent-pkg-xyz-123");
      assert.equal(result, null);
    } finally {
      await cleanup();
    }
  });
});
