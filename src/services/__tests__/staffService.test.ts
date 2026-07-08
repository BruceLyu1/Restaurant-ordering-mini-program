import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StaffMember } from "../../types";
import {
  loadStaff,
  loadStaffAsync,
  saveStaffAsync,
  STAFF_CHANGE_EVENT,
  STAFF_STORAGE_KEY,
} from "../staffService";
import { loadSupabaseStaffMembers, saveSupabaseStaffMembers } from "../supabaseStaffService";

vi.mock("../supabaseStaffService", () => ({
  loadSupabaseStaffMembers: vi.fn(async () => []),
  saveSupabaseStaffMembers: vi.fn(async (staff: StaffMember[]) => staff),
}));

describe("staffService", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
  });

  it("normalizes legacy localStorage staff roles when loading", () => {
    window.localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify([
      { active: true, id: 1, name: "Alex", role: "Manager" },
      { active: true, id: 2, name: "May", role: "收銀員" },
      { active: true, id: 3, name: "Sam", role: "樓面" },
    ]));

    expect(loadStaff().map((member) => member.role)).toEqual(["manager", "cashier", "floor"]);
  });

  it("persists staff through the async local path and dispatches the staff change event", async () => {
    const listener = vi.fn();
    window.addEventListener(STAFF_CHANGE_EVENT, listener);
    const staff: StaffMember[] = [{ active: true, email: "alex@example.com", id: 1, name: "Alex", role: "manager" }];

    await saveStaffAsync(staff);

    window.removeEventListener(STAFF_CHANGE_EVENT, listener);
    expect(JSON.parse(window.localStorage.getItem(STAFF_STORAGE_KEY) || "[]")).toEqual(staff);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(saveSupabaseStaffMembers).not.toHaveBeenCalled();
  });

  it("loads and saves staff through Supabase in supabase mode", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const staff: StaffMember[] = [{ active: true, email: "alex@example.com", id: 1, name: "Alex", role: "manager" }];
    vi.mocked(loadSupabaseStaffMembers).mockResolvedValueOnce(staff);

    await expect(loadStaffAsync()).resolves.toEqual(staff);
    await expect(saveStaffAsync(staff)).resolves.toEqual(staff);

    expect(loadSupabaseStaffMembers).toHaveBeenCalled();
    expect(saveSupabaseStaffMembers).toHaveBeenCalledWith(staff);
    expect(window.localStorage.getItem(STAFF_STORAGE_KEY)).toBeNull();
  });
});
