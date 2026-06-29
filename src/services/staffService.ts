import { seededStaff } from "../data/staff";
import type { StaffMember } from "../types";
import { readStorage, writeStorage } from "./storage";

export const STAFF_STORAGE_KEY = "harbour-admin-staff";
export const STAFF_CHANGE_EVENT = "harbour-staff-change";

export function loadStaff(): StaffMember[] {
  const staff = readStorage<StaffMember[]>(STAFF_STORAGE_KEY, seededStaff);
  return Array.isArray(staff) ? staff : seededStaff;
}

export function saveStaff(staff: StaffMember[]): void {
  writeStorage(STAFF_STORAGE_KEY, staff, STAFF_CHANGE_EVENT);
}

export function createStaffMember(staff: StaffMember[], member: Omit<StaffMember, "id">): StaffMember[] {
  return [...staff, { ...member, id: Date.now() }];
}

export function toggleStaffActive(staff: StaffMember[], id: number): StaffMember[] {
  return staff.map((member) => (
    member.id === id ? { ...member, active: !member.active } : member
  ));
}
