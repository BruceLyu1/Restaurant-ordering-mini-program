import { beforeEach, describe, expect, it } from "vitest";
import { STAFF_STORAGE_KEY } from "../../services/staffService";
import { useStaffStore } from "../staffStore";

describe("staffStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useStaffStore.setState({ staff: [] });
  });

  it("adds and toggles staff through the service boundary", () => {
    useStaffStore.getState().add({ active: true, name: "Alex", role: "Manager" });

    const created = useStaffStore.getState().staff[0];
    expect(created.name).toBe("Alex");
    expect(JSON.parse(window.localStorage.getItem(STAFF_STORAGE_KEY) || "[]")).toHaveLength(1);

    useStaffStore.getState().toggleActive(created.id);
    expect(useStaffStore.getState().staff[0].active).toBe(false);
  });
});
