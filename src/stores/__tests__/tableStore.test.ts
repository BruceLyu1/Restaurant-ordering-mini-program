import { beforeEach, describe, expect, it } from "vitest";
import { TABLE_STORAGE_KEY } from "../../services/tableService";
import { useTableStore } from "../tableStore";

describe("tableStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useTableStore.setState({ tables: [] });
  });

  it("loads tables through the table service", () => {
    window.localStorage.setItem(TABLE_STORAGE_KEY, JSON.stringify([
      { number: "21", seats: 2, status: "available" },
    ]));

    useTableStore.getState().load();

    expect(useTableStore.getState().tables).toEqual([
      { number: "21", seats: 2, status: "available" },
    ]);
  });
});
