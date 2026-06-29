import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useStaffStore } from "../../stores/staffStore";
import { StaffManagement } from "../StaffManagement";
import type { StaffMember } from "../../types";

const staff: StaffMember[] = [
  { active: true, id: 1, name: "Alex", role: "Manager" },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("StaffManagement", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("harbour-admin-staff", JSON.stringify(staff));
    useStaffStore.setState({ staff });
  });

  it("renders staff and toggles account status", () => {
    renderWithLanguage(<StaffManagement />);

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("Can sign in")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Toggle account status for Alex"));
    expect(screen.getByText("Disabled")).toBeTruthy();
  });

  it("adds a staff member", () => {
    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));
    fireEvent.change(screen.getByLabelText("Staff name"), { target: { value: "Casey" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Casey")).toBeTruthy();
  });
});
