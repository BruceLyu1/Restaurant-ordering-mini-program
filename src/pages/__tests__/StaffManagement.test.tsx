import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useStaffStore } from "../../stores/staffStore";
import { StaffManagement } from "../StaffManagement";
import type { StaffMember } from "../../types";

const staff: StaffMember[] = [
  { active: true, id: 1, name: "Alex", role: "manager" },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("StaffManagement", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("harbour-admin-staff", JSON.stringify(staff));
    useStaffStore.setState({
      add: vi.fn(async (member: Omit<StaffMember, "id">) => {
        useStaffStore.setState({ staff: [...useStaffStore.getState().staff, { ...member, id: 2 }] });
      }),
      staff,
      toggleActive: vi.fn(async (id: number) => {
        useStaffStore.setState({
          staff: useStaffStore.getState().staff.map((member) => (
            member.id === id ? { ...member, active: !member.active } : member
          )),
        });
      }),
    } as Partial<ReturnType<typeof useStaffStore.getState>>);
  });

  it("renders staff and toggles account status", async () => {
    renderWithLanguage(<StaffManagement />);

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Manager")).toBeTruthy();
    expect(screen.getByText("Can sign in")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Toggle account status for Alex"));
    await waitFor(() => expect(screen.getByText("Disabled")).toBeTruthy());
  });

  it("adds a staff member", async () => {
    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));
    fireEvent.change(screen.getByLabelText("Staff name"), { target: { value: "Casey" } });
    fireEvent.change(screen.getByLabelText("Staff role"), { target: { value: "cashier" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(screen.getByText("Casey")).toBeTruthy());
    expect(useStaffStore.getState().add).toHaveBeenCalledWith({
      active: true,
      name: "Casey",
      role: "cashier",
    });
  });
});
