import { describe, expect, it } from "vitest";
import { getInitialViewFromLocation } from "../view";

function location(search: string, port: string, hostname = "127.0.0.1") {
  return { hostname, port, search };
}

describe("getInitialViewFromLocation", () => {
  it("uses explicit admin view query before port defaults", () => {
    expect(getInitialViewFromLocation(location("?view=admin", "5173"))).toBe("admin");
  });

  it("uses explicit guest view query before port defaults", () => {
    expect(getInitialViewFromLocation(location("?view=guest", "5174"))).toBe("guest");
  });

  it("uses port 5174 as the local admin entry without a view query", () => {
    expect(getInitialViewFromLocation(location("", "5174"))).toBe("admin");
    expect(getInitialViewFromLocation(location("", "5174", "localhost"))).toBe("admin");
  });

  it("defaults to guest for other ports without a view query", () => {
    expect(getInitialViewFromLocation(location("", "5173"))).toBe("guest");
    expect(getInitialViewFromLocation(location("", ""))).toBe("guest");
  });
});
