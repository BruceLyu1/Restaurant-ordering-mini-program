import { seededStaff } from "../data/staff";
import type { StaffMember } from "../types";
import { getDataSourceMode } from "./dataSource";
import { readStorage, writeStorage } from "./storage";

export const STAFF_STORAGE_KEY = "harbour-admin-staff";
export const STAFF_CHANGE_EVENT = "harbour-staff-change";

export function normalizeStaffRole(role: string): "manager" | "cashier" | "floor" {
  const normalized = role.trim().toLowerCase();
  if (normalized === "manager" || normalized === "經理" || normalized === "经理" || role === "缍撶悊") return "manager";
  if (
    normalized === "cashier" ||
    normalized === "收銀員" ||
    normalized === "收银员" ||
    role === "鏀堕妧鍝?"
  ) return "cashier";
  return "floor";
}

export function getStaffRoleLabelKey(role: string): string {
  return `staffManagement.roles.${normalizeStaffRole(role)}`;
}

function normalizeStaffMember(member: StaffMember): StaffMember {
  return {
    ...member,
    email: member.email?.trim() || undefined,
    role: normalizeStaffRole(member.role),
  };
}

export function loadStaff(): StaffMember[] {
  const staff = readStorage<StaffMember[]>(STAFF_STORAGE_KEY, seededStaff);
  return (Array.isArray(staff) ? staff : seededStaff).map(normalizeStaffMember);
}

export async function loadStaffAsync(): Promise<StaffMember[]> {
  if (getDataSourceMode() !== "supabase") return loadStaff();

  try {
    const { loadSupabaseStaffMembers } = await import("./supabaseStaffService");
    return await loadSupabaseStaffMembers();
  } catch {
    return loadStaff();
  }
}

export function saveStaff(staff: StaffMember[]): void {
  writeStorage(STAFF_STORAGE_KEY, staff.map(normalizeStaffMember), STAFF_CHANGE_EVENT);
}

export async function saveStaffAsync(staff: StaffMember[]): Promise<StaffMember[]> {
  const normalized = staff.map(normalizeStaffMember);
  if (getDataSourceMode() !== "supabase") {
    saveStaff(normalized);
    return normalized;
  }

  const { saveSupabaseStaffMembers } = await import("./supabaseStaffService");
  return await saveSupabaseStaffMembers(normalized);
}

export function createStaffMember(staff: StaffMember[], member: Omit<StaffMember, "id">): StaffMember[] {
  const id = Date.now();
  return [...staff, {
    ...member,
    clientId: member.clientId || String(id),
    email: member.email?.trim() || undefined,
    id,
    role: normalizeStaffRole(member.role),
  }];
}

export function toggleStaffActive(staff: StaffMember[], id: number): StaffMember[] {
  return staff.map((member) => (
    member.id === id ? { ...member, active: !member.active } : member
  ));
}
