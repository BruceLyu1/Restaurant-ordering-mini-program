import { describe, expect, it } from "vitest";
import { formatDateTime, formatTime, isSameLocalDate } from "../date";

describe("date utils", () => {
  it("compares dates by local calendar day", () => {
    expect(isSameLocalDate("2026-06-24T01:00:00+08:00", new Date("2026-06-24T22:00:00+08:00"))).toBe(true);
    expect(isSameLocalDate("2026-06-23T23:59:00+08:00", new Date("2026-06-24T00:01:00+08:00"))).toBe(false);
  });

  it("formats times as HH:mm", () => {
    expect(formatTime("2026-06-24T09:05:00+08:00")).toContain("09:05");
  });

  it("formats settled timestamps with the local calendar date and time", () => {
    expect(formatDateTime("2026-06-24T09:05:00+08:00")).toMatch(/^2026-06-24 .*09:05$/);
  });

  it("handles invalid dates defensively", () => {
    expect(isSameLocalDate("not-a-date", new Date("2026-06-24T00:00:00+08:00"))).toBe(false);
    expect(formatTime("not-a-date")).toBe("--:--");
    expect(formatDateTime("not-a-date")).toBe("---- -- --:--");
  });
});
