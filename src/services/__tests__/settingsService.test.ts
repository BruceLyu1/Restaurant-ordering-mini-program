import { describe, expect, it } from "vitest";
import { getCurrentMealPeriod, isItemAvailableForMealPeriod } from "../settingsService";

const settings = {
  mealPeriods: [
    { id: "breakfast", name: "早餐", start: "07:00", end: "11:00" },
    { id: "lunch", name: "午市", start: "11:00", end: "17:00" },
  ],
};

describe("settingsService", () => {
  it("finds the active meal period at the start boundary", () => {
    expect(getCurrentMealPeriod(settings, new Date("2026-06-23T11:00:00"))?.id).toBe("lunch");
  });

  it("checks whether a dish is available in the active meal period", () => {
    expect(isItemAvailableForMealPeriod({ mealPeriods: ["lunch"] }, settings.mealPeriods[1])).toBe(true);
    expect(isItemAvailableForMealPeriod({ mealPeriods: ["breakfast"] }, settings.mealPeriods[1])).toBe(false);
  });
});
