import { describe, expect, it } from "vitest";
import { chunkRelationshipContactIds } from "./repository";

describe("chunkRelationshipContactIds", () => {
  it("keeps large relationship lookups below PostgREST URL limits", () => {
    const ids = Array.from({ length: 742 }, (_, index) => `contact-${index}`);
    const batches = chunkRelationshipContactIds(ids);

    expect(batches).toHaveLength(8);
    expect(batches.every((batch) => batch.length <= 100)).toBe(true);
    expect(batches.flat()).toEqual(ids);
  });

  it("handles empty and invalid batch sizes safely", () => {
    expect(chunkRelationshipContactIds([])).toEqual([]);
    expect(chunkRelationshipContactIds(["a", "b"], 0)).toEqual([["a"], ["b"]]);
  });
});
