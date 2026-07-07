import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_STORAGE_KEY } from "../../services/staffService";
import * as staffService from "../../services/staffService";
import { useStaffStore } from "../staffStore";

describe("staffStore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    useStaffStore.setState({ staff: [] });
  });

  it("adds and toggles staff through the service boundary", async () => {
    await useStaffStore.getState().add({ active: true, name: "Alex", role: "manager" });

    const created = useStaffStore.getState().staff[0];
    expect(created.name).toBe("Alex");
    expect(JSON.parse(window.localStorage.getItem(STAFF_STORAGE_KEY) || "[]")).toHaveLength(1);

    await useStaffStore.getState().toggleActive(created.id);
    expect(useStaffStore.getState().staff[0].active).toBe(false);
  });

  it("rolls back optimistic Supabase staff updates when remote save fails", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const previous = [{ active: true, id: 1, name: "Alex", role: "manager" }];
    useStaffStore.setState({ staff: previous });
    vi.spyOn(staffService, "saveStaffAsync").mockRejectedValueOnce(new Error("save failed"));

    await expect(useStaffStore.getState().toggleActive(1)).rejects.toThrow("save failed");

    expect(useStaffStore.getState().staff).toEqual(previous);
  });

  it("keeps optimistic staff when realtime reload returns a stale remote snapshot", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = [{ active: true, id: 1, name: "Alex", role: "manager" }];
    const stale = [{ active: true, id: 1, name: "Alex", role: "manager" }];
    useStaffStore.setState({ staff: initial });
    let resolveSave: (staff: typeof initial) => void = () => undefined;
    vi.spyOn(staffService, "saveStaffAsync").mockImplementation((staff) => new Promise((resolve) => {
      resolveSave = resolve;
      void staff;
    }));
    vi.spyOn(staffService, "loadStaffAsync").mockResolvedValue(stale);

    const save = useStaffStore.getState().toggleActive(1);
    await vi.waitFor(() => expect(useStaffStore.getState().staff[0].active).toBe(false));
    await useStaffStore.getState().load();

    expect(useStaffStore.getState().staff[0].active).toBe(false);
    resolveSave(useStaffStore.getState().staff);
    await save;
  });

  it("serializes rapid Supabase staff saves so later status wins", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const initial = [
      { active: true, id: 1, name: "Alex", role: "manager" },
      { active: true, id: 2, name: "Casey", role: "cashier" },
    ];
    const savedStaff: typeof initial[] = [];
    const resolvers: Array<(staff: typeof initial) => void> = [];
    useStaffStore.setState({ staff: initial });
    vi.spyOn(staffService, "saveStaffAsync").mockImplementation((staff) => {
      savedStaff.push(staff);
      return new Promise((resolve) => resolvers.push(resolve));
    });

    const firstSave = useStaffStore.getState().toggleActive(1);
    const secondSave = useStaffStore.getState().toggleActive(2);

    expect(useStaffStore.getState().staff.map((member) => member.active)).toEqual([false, false]);
    await vi.waitFor(() => expect(savedStaff).toHaveLength(1));
    resolvers[0](savedStaff[0]);
    await vi.waitFor(() => expect(savedStaff).toHaveLength(2));
    resolvers[1](savedStaff[1]);
    await Promise.all([firstSave, secondSave]);

    expect(useStaffStore.getState().staff.map((member) => member.active)).toEqual([false, false]);
  });
});
