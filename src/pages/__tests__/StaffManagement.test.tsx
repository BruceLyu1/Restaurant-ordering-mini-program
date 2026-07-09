import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useStaffStore } from "../../stores/staffStore";
import { useAuthStore } from "../../stores/authStore";
import { StaffManagement } from "../StaffManagement";
import type { StaffMember } from "../../types";
import {
  createStaffAccount,
} from "../../services/staffAccountService";

vi.mock("../../services/staffAccountService", () => ({
  createStaffAccount: vi.fn(async () => undefined),
}));

const staff: StaffMember[] = [
  { active: true, email: "alex@example.com", id: 1, name: "Alex", role: "manager" },
  { active: true, authUserId: "auth-2", email: "casey@example.com", id: 2, name: "Casey", role: "cashier" },
  { active: false, email: "may@example.com", id: 3, name: "May", role: "floor" },
];

function renderWithLanguage(ui: React.ReactElement) {
  window.localStorage.setItem("harbour-language", "en");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe("StaffManagement", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("harbour-admin-staff", JSON.stringify(staff));
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    vi.mocked(createStaffAccount).mockClear();
    useAuthStore.setState({ staffProfile: staff[0], status: "signed-in" });
    useStaffStore.setState({
      add: vi.fn(async (member: Omit<StaffMember, "id">) => {
        useStaffStore.setState({ staff: [...useStaffStore.getState().staff, { ...member, id: 4 }] });
      }),
      load: vi.fn(async () => undefined),
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
    expect(screen.getByText("alex@example.com")).toBeTruthy();
    expect(screen.getByText("Manager")).toBeTruthy();
    expect(screen.getAllByText("Can sign in").length).toBeGreaterThan(0);
    expect(screen.getByText("Not linked")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Toggle account status for Casey"));
    await waitFor(() => expect(screen.getByLabelText("Toggle account status for Casey").getAttribute("aria-pressed")).toBe("false"));
  });

  it("uses inactive styling for every disabled staff status", () => {
    renderWithLanguage(<StaffManagement />);

    screen.getAllByText("Disabled").forEach((status) => {
      expect(status.className).toContain("inactive");
    });
  });

  it("does not allow disabling the last active manager", async () => {
    useAuthStore.setState({ staffProfile: { ...staff[1], role: "cashier" }, status: "signed-in" });
    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByLabelText("Toggle account status for Alex"));

    expect(useStaffStore.getState().toggleActive).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("At least one active manager account must remain enabled.");
    expect(screen.getByLabelText("Toggle account status for Alex").getAttribute("aria-pressed")).toBe("true");
  });

  it("does not allow disabling the currently signed-in manager", async () => {
    useStaffStore.setState({ staff: [...staff, { active: true, email: "riley@example.com", id: 4, name: "Riley", role: "manager" }] });
    useAuthStore.setState({ staffProfile: staff[0], status: "signed-in" });
    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByLabelText("Toggle account status for Alex"));

    expect(useStaffStore.getState().toggleActive).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("You cannot disable the manager account currently signed in.");
    expect(screen.getByLabelText("Toggle account status for Alex").getAttribute("aria-pressed")).toBe("true");
  });

  it("shows specific account creation errors returned by the service", async () => {
    vi.mocked(createStaffAccount).mockRejectedValueOnce(new Error("email already exists"));
    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));
    fireEvent.change(screen.getByLabelText("Staff name"), { target: { value: "Jordan" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "staff-pass-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Add staff account" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("email already exists"));
  });

  it("does not show email invite or reset actions", () => {
    renderWithLanguage(<StaffManagement />);

    expect(screen.queryByRole("button", { name: "Send invite to May" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset password for Casey" })).toBeNull();
  });

  it("creates a Supabase staff account", async () => {
    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));
    fireEvent.change(screen.getByLabelText("Staff name"), { target: { value: "Jordan" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Staff role"), { target: { value: "cashier" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "staff-pass-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Add staff account" }));

    await waitFor(() => expect(createStaffAccount).toHaveBeenCalledWith({
      email: "jordan@example.com",
      name: "Jordan",
      password: "staff-pass-123",
      role: "cashier",
    }));
    expect(useStaffStore.getState().add).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Staff account created for jordan@example.com.")).toBeTruthy());
  });

  it("shows an error when adding staff fails", async () => {
    vi.mocked(createStaffAccount).mockRejectedValueOnce(new Error("save failed"));

    renderWithLanguage(<StaffManagement />);

    fireEvent.click(screen.getByRole("button", { name: "Add staff" }));
    fireEvent.change(screen.getByLabelText("Staff name"), { target: { value: "Jordan" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "jordan@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "staff-pass-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Add staff account" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("save failed"));
  });
});
