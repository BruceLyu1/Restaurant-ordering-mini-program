import { describe, expect, it } from "vitest";
import { money } from "../money";

describe("money", () => {
  it("formats Hong Kong dollar values for display", () => {
    expect(money(1288)).toBe("HK$ 1,288");
  });
});
