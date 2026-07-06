import { beforeEach, describe, expect, it, vi } from "vitest";
import { TABLE_STORAGE_KEY } from "../../services/tableService";
import * as tableService from "../../services/tableService";
import { useTableStore } from "../tableStore";

describe("tableStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    useTableStore.setState({ tables: [] });
  });

  it("loads tables through the table service", async () => {
    window.localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify([
      { number: "21", seats: 2, status: "available" },
    ]));

    await useTableStore.getState().load();

    expect(useTableStore.getState().tables).toEqual([
      { number: "21", seats: 2, status: "available" },
    ]);
  });

  it("saves table updates through local storage", async () => {
    await useTableStore.getState().updateTables([
      { number: "21", seats: 2, status: "available" },
    ]);

    expect(useTableStore.getState().tables).toEqual([
      { number: "21", seats: 2, status: "available" },
    ]);
    expect(JSON.parse(window.localStorage.getItem(TABLE_STORAGE_KEY) || "[]")).toEqual([
      { number: "21", seats: 2, status: "available" },
    ]);
  });

  it("does not publish local tables before supabase load resolves", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    window.localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify([
      { number: "99", seats: 8, status: "available" },
    ]));
    let resolveLoad: (tables: Awaited<ReturnType<typeof tableService.loadTablesAsync>>) => void = () => undefined;
    vi.spyOn(tableService, "loadTablesAsync").mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));

    const result = useTableStore.getState().load();

    expect(useTableStore.getState().tables).toEqual([]);
    resolveLoad([{ number: "01", seats: 4, status: "available" }]);
    await result;
    expect(useTableStore.getState().tables).toEqual([
      { number: "01", seats: 4, status: "available" },
    ]);
  });

  it("rolls back optimistic table updates when remote save fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useTableStore.setState({ tables: [{ number: "01", seats: 4, status: "available" }] });
    vi.spyOn(tableService, "saveTablesAsync").mockRejectedValueOnce(new Error("save failed"));

    await expect(useTableStore.getState().updateTables([
      { number: "01", seats: 6, status: "available" },
    ])).rejects.toThrow("save failed");

    expect(useTableStore.getState().tables).toEqual([
      { number: "01", seats: 4, status: "available" },
    ]);
  });
});
