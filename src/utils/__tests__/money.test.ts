import { describe, expect, it } from "vitest";
import { money } from "../money";

describe("money", () => {
  it("formats Hong Kong dollar values for display", () => {
    expect(money(1288)).toBe("HK$ 1,288");
  });

  it("handles invalid numeric values defensively", () => {
    expect(money(Number.NaN)).toBe("HK$ --");
    expect(money(Number.POSITIVE_INFINITY)).toBe("HK$ --");
  });
});
