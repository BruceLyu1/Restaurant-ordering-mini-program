import type { StaffMember } from "../types";
import type { NavItem } from "./navigation";
import { navItems } from "./navigation";

const STAFF_ALLOWED_SECTIONS = new Set(["dashboard", "orders"]);

export function isManager(profile: StaffMember | null): boolean {
  return profile?.role === "manager";
}

export function canAccessAdminSection(profile: StaffMember | null, section: string): boolean {
  if (isManager(profile)) return true;
  return STAFF_ALLOWED_SECTIONS.has(section);
}

export function getAllowedNavItems(profile: StaffMember | null): NavItem[] {
  return navItems.filter(([section]) => canAccessAdminSection(profile, section));
}
