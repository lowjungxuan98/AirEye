import { describe, expect, it } from "vitest";
import { sortByCreatedAtDesc } from "../../../../src/libs/utils/sort-by-created-at.util";

describe("sortByCreatedAtDesc", () => {
  it("sorts by createdAt descending without mutating the input", () => {
    const a = { id: "a", createdAt: 1 };
    const b = { id: "b", createdAt: 3 };
    const c = { id: "c", createdAt: 2 };
    const input = [a, b, c];
    const sorted = sortByCreatedAtDesc(input);
    expect(sorted.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(input.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("handles empty arrays", () => {
    expect(sortByCreatedAtDesc([])).toEqual([]);
  });
});
