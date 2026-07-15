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

  it("serializes consecutive remote table saves", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    let resolveFirstSave: () => void = () => undefined;
    let resolveSecondSave: () => void = () => undefined;
    vi.spyOn(tableService, "saveTablesAsync")
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirstSave = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondSave = resolve; }));

    const first = useTableStore.getState().updateTables([{ number: "01", seats: 4, status: "available" }]);
    const second = useTableStore.getState().updateTables([{ number: "01", seats: 6, status: "available" }]);

    await vi.waitFor(() => expect(tableService.saveTablesAsync).toHaveBeenCalledTimes(1));
    expect(tableService.saveTablesAsync).toHaveBeenLastCalledWith([{ number: "01", seats: 4, status: "available" }]);
    resolveFirstSave();
    await vi.waitFor(() => expect(tableService.saveTablesAsync).toHaveBeenCalledTimes(2));
    expect(tableService.saveTablesAsync).toHaveBeenLastCalledWith([{ number: "01", seats: 6, status: "available" }]);
    resolveSecondSave();

    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(useTableStore.getState().tables).toEqual([{ number: "01", seats: 6, status: "available" }]);
  });

  it("defers a remote refresh while a table save is pending", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    let resolveSave: () => void = () => undefined;
    vi.spyOn(tableService, "saveTablesAsync").mockImplementationOnce(() => new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const loadTablesAsync = vi.spyOn(tableService, "loadTablesAsync").mockResolvedValue([
      { number: "01", seats: 6, status: "available" },
    ]);

    const save = useTableStore.getState().updateTables([{ number: "01", seats: 6, status: "available" }]);
    await vi.waitFor(() => expect(tableService.saveTablesAsync).toHaveBeenCalledTimes(1));
    await useTableStore.getState().load();

    expect(loadTablesAsync).not.toHaveBeenCalled();
    resolveSave();
    await save;

    expect(loadTablesAsync).toHaveBeenCalledTimes(1);
    expect(useTableStore.getState().tables).toEqual([{ number: "01", seats: 6, status: "available" }]);
  });

  it("restores the final remote snapshot when the latest table save fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    vi.spyOn(tableService, "saveTablesAsync")
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("save failed"));
    vi.spyOn(tableService, "loadTablesAsync").mockResolvedValue([
      { number: "01", seats: 4, status: "available" },
    ]);

    const first = useTableStore.getState().updateTables([{ number: "01", seats: 4, status: "available" }]);
    const second = useTableStore.getState().updateTables([{ number: "01", seats: 6, status: "available" }]);

    await first;
    await expect(second).rejects.toThrow("save failed");

    expect(useTableStore.getState().tables).toEqual([{ number: "01", seats: 4, status: "available" }]);
  });
});
