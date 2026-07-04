import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapWithConcurrency } from "../src/concurrency.js";
import { formatGenerationProgressMessage } from "../src/progress.js";

describe("mapWithConcurrency", () => {
  it("preserves result order", async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 5 - value));
      return value * 2;
    });

    assert.deepEqual(results, [2, 4, 6, 8, 10]);
  });

  it("returns empty array for empty input", async () => {
    const results = await mapWithConcurrency([], 3, async () => 1);
    assert.deepEqual(results, []);
  });
});

describe("formatGenerationProgressMessage", () => {
  it("shows completed count", () => {
    const message = formatGenerationProgressMessage({
      total: 10,
      completed: 3,
      failed: 0,
      inFlight: 0,
    });

    assert.match(message, /3\/10 complete/);
  });

  it("shows in-flight and failed counts", () => {
    const message = formatGenerationProgressMessage({
      total: 10,
      completed: 7,
      failed: 1,
      inFlight: 2,
    });

    assert.match(message, /7\/10 complete/);
    assert.match(message, /2 in flight/);
    assert.match(message, /1 failed/);
  });
});
