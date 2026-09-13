import { describe, expect, it } from "vitest";
import { maxBy, minBy } from "@/lib/analytics/stats";

interface Item {
  id: string;
  value: number | null;
}

const items: Item[] = [
  { id: "a", value: 3 },
  { id: "b", value: null },
  { id: "c", value: 7 },
  { id: "d", value: 5 },
];

describe("maxBy", () => {
  it("returns the item with the highest selector value", () => {
    expect(maxBy(items, (i) => i.value)?.id).toBe("c");
  });

  it("skips items whose selector returns null", () => {
    expect(maxBy([{ id: "only-null", value: null }], (i) => i.value)).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(maxBy<Item>([], (i) => i.value)).toBeNull();
  });

  it("returns the first of tied maximum values", () => {
    const tied: Item[] = [
      { id: "first", value: 5 },
      { id: "second", value: 5 },
    ];
    expect(maxBy(tied, (i) => i.value)?.id).toBe("first");
  });
});

describe("minBy", () => {
  it("returns the item with the lowest selector value", () => {
    expect(minBy(items, (i) => i.value)?.id).toBe("a");
  });

  it("skips items whose selector returns null", () => {
    expect(minBy([{ id: "only-null", value: null }], (i) => i.value)).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(minBy<Item>([], (i) => i.value)).toBeNull();
  });
});
