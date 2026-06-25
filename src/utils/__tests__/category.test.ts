import { describe, expect, it } from "vitest";
import { normalizeCategoryName } from "../category";

describe("normalizeCategoryName", () => {
  it("normalizes known simplified category aliases", () => {
    expect(normalizeCategoryName(" 饮品 ")).toBe("飲品");
  });
});
