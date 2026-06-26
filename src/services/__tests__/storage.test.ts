import { beforeEach, describe, expect, it, vi } from "vitest";
import { readStorage, subscribeToStorage, writeStorage } from "../storage";

describe("storage service", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads valid JSON values and falls back for missing keys", () => {
    window.localStorage.setItem("demo", JSON.stringify({ ready: true }));

    expect(readStorage("demo", { ready: false })).toEqual({ ready: true });
    expect(readStorage("missing", "fallback")).toBe("fallback");
  });

  it("removes broken JSON and returns the fallback", () => {
    window.localStorage.setItem("broken", "{not-json");

    expect(readStorage("broken", 42)).toBe(42);
    expect(window.localStorage.getItem("broken")).toBeNull();
  });

  it("writes JSON and dispatches a custom event when requested", () => {
    const listener = vi.fn();
    window.addEventListener("demo-change", listener);

    writeStorage("demo", { count: 2 }, "demo-change");

    expect(JSON.parse(window.localStorage.getItem("demo") || "{}")).toEqual({ count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener("demo-change", listener);
  });

  it("subscribes to matching storage and custom events", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToStorage("demo", callback, "demo-change");

    window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
    window.dispatchEvent(new StorageEvent("storage", { key: "demo" }));
    window.dispatchEvent(new CustomEvent("demo-change"));
    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: "demo" }));

    expect(callback).toHaveBeenCalledTimes(2);
  });
});
