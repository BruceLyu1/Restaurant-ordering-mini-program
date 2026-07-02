import { describe, expect, it } from "vitest";
import { normalizeCategoryName } from "../category";

describe("normalizeCategoryName", () => {
  it("normalizes known simplified category aliases", () => {
    expect(normalizeCategoryName(" 饮品 ")).toBe("飲品");
  });

  it("normalizes 饭类 to 飯類", () => {
    expect(normalizeCategoryName("饭类")).toBe("飯類");
  });

  it("normalizes 点心 to 點心", () => {
    expect(normalizeCategoryName("点心")).toBe("點心");
  });

  it("normalizes 面类 to 麵類", () => {
    expect(normalizeCategoryName("面类")).toBe("麵類");
  });

  it("trims whitespace around category names", () => {
    expect(normalizeCategoryName("  饮品  ")).toBe("飲品");
  });

  it("returns traditional Chinese unchanged", () => {
    expect(normalizeCategoryName("飲品")).toBe("飲品");
  });

  it("returns unknown category unchanged", () => {
    expect(normalizeCategoryName("pizza")).toBe("pizza");
  });
});
