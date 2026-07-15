import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { useAuthStore } from "../../../stores/authStore";
import { useSettingsStore } from "../../../stores/settingsStore";
import { AdminAuthGuard } from "../AdminAuthGuard";

function renderGuard() {
  window.localStorage.setItem("harbour-language", "en");
  return render(
    <LanguageProvider>
      <AdminAuthGuard>
        <div>Protected Admin</div>
      </AdminAuthGuard>
    </LanguageProvider>,
  );
}

describe("AdminAuthGuard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    useAuthStore.setState({
      error: null,
      session: null,
      staffProfile: null,
      status: "signed-out",
      signIn: vi.fn(async () => undefined),
      loadSession: vi.fn(async () => undefined),
    } as Partial<ReturnType<typeof useAuthStore.getState>>);
    useSettingsStore.getState().load();
  });

  it("uses the existing PIN guard in local mode", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "local");
    renderGuard();

    expect(screen.getByRole("heading", { name: "Admin Verification" })).toBeTruthy();
    expect(screen.queryByText("Protected Admin")).toBeNull();
  });

  it("shows the email password login form in supabase mode when signed out", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    renderGuard();

    expect(screen.getByRole("heading", { name: "Staff sign in" })).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
    expect(screen.queryByText("Protected Admin")).toBeNull();
  });

  it("shows a loading state while restoring a Supabase session", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useAuthStore.setState({ status: "loading" });

    renderGuard();

    expect(screen.getByRole("status").textContent).toContain("Verifying sign-in status...");
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it.each([
    ["invalid-credentials", "Email or password is incorrect."],
    ["inactive", "This staff account is disabled. Contact a manager."],
    ["no-access", "This staff account is not allowed to access the dashboard."],
    ["service-unavailable", "Service is temporarily unavailable. Please try again."],
  ] as const)("shows the %s authentication error", (error, message) => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useAuthStore.setState({
      error,
      status: error === "service-unavailable" ? "error" : "unauthorized",
    });

    renderGuard();

    expect(screen.getByRole("alert").textContent).toContain(message);
  });

  it("submits email and password through auth store", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    const signIn = vi.fn(async () => undefined);
    useAuthStore.setState({ signIn } as Partial<ReturnType<typeof useAuthStore.getState>>);

    renderGuard();
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "alex@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("alex@example.com", "secret123");
    });
  });

  it("renders children for signed-in staff", () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    useAuthStore.setState({
      staffProfile: { active: true, id: 1, name: "Alex", role: "manager" },
      status: "signed-in",
    });

    renderGuard();

    expect(screen.getByText("Protected Admin")).toBeTruthy();
  });
});
