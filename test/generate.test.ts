import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  STEERING_HEADER,
  assembleSteeringDocument,
  mergeSteeringSections,
} from "../src/generate.js";

describe("assembleSteeringDocument", () => {
  it("wraps sections with the standard header", () => {
    const doc = assembleSteeringDocument("## [react]\n- use hooks\n");
    assert.match(doc, /^# airo — package steering/);
    assert.match(doc, /## \[react\]/);
    assert.match(doc, /run `npx @paavonykanen\/airo` to update/);
  });

  it("returns header only when sections are empty", () => {
    const doc = assembleSteeringDocument("");
    assert.equal(doc, `${STEERING_HEADER}\n`);
  });
});

describe("mergeSteeringSections", () => {
  const existing = `${STEERING_HEADER}
## [react]
- keep hooks at top level

## [lodash]
- utility helpers
`;

  it("removes uninstalled package sections", async () => {
    const merged = await mergeSteeringSections(existing, "", ["lodash"]);
    assert.match(merged, /## \[react\]/);
    assert.doesNotMatch(merged, /## \[lodash\]/);
  });

  it("appends new sections", async () => {
    const merged = await mergeSteeringSections(
      existing,
      "## [zod]\n- validate inputs\n",
      [],
    );

    assert.match(merged, /## \[react\]/);
    assert.match(merged, /## \[lodash\]/);
    assert.match(merged, /## \[zod\]/);
  });

  it("removes and appends in one pass", async () => {
    const merged = await mergeSteeringSections(
      existing,
      "## [zod]\n- validate inputs\n",
      ["lodash"],
    );

    assert.match(merged, /## \[react\]/);
    assert.doesNotMatch(merged, /## \[lodash\]/);
    assert.match(merged, /## \[zod\]/);
  });

  it("replaces updated package sections instead of duplicating", async () => {
    const withUnbracketed = `${STEERING_HEADER}
## openai
- old guidance

## [react]
- keep react
`;
    const merged = await mergeSteeringSections(
      withUnbracketed,
      "## [openai]\n- new guidance\n",
      [],
      ["openai"],
    );

    assert.match(merged, /new guidance/);
    assert.doesNotMatch(merged, /old guidance/);
    assert.equal((merged.match(/## (\[openai\]|openai)/g) ?? []).length, 1);
    assert.match(merged, /## \[react\]/);
  });
});
