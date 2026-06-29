import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../../i18n/LanguageContext";
import { ErrorBoundary } from "../ErrorBoundary";

function BrokenChild(): React.ReactElement {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("harbour-language", "en");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders translated fallback content when a child throws", () => {
    render(
      <LanguageProvider>
        <ErrorBoundary>
          <BrokenChild />
        </ErrorBoundary>
      </LanguageProvider>,
    );

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
  });
});
