import { describe, expect, it } from "vitest";
import { formatAdminDate, formatTime, isSameLocalDate } from "../date";

describe("date utils", () => {
  it("compares dates by local calendar day", () => {
    expect(isSameLocalDate("2026-06-24T01:00:00+08:00", new Date("2026-06-24T22:00:00+08:00"))).toBe(true);
    expect(isSameLocalDate("2026-06-23T23:59:00+08:00", new Date("2026-06-24T00:01:00+08:00"))).toBe(false);
  });

  it("formats times as HH:mm", () => {
    expect(formatTime("2026-06-24T09:05:00+08:00")).toContain("09:05");
  });

  it("formats admin dates with readable traditional Chinese weekday text", () => {
    expect(formatAdminDate(new Date(2026, 5, 23))).toBe("2026年6月23日 · 星期二");
  });
});
