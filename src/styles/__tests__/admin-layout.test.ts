import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readStyle(file: string): string {
  return readFileSync(resolve(__dirname, `../${file}`), "utf8");
}

function ruleBody(css: string, selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]+)\\}`))?.groups?.body || "";
}

describe("admin layout overflow guard", () => {
  it("prevents root-level horizontal scrolling", () => {
    const css = readStyle("base.css");
    const html = ruleBody(css, "html");
    const body = ruleBody(css, "body");
    const root = ruleBody(css, "#root");

    expect(html).toContain("overflow-x: hidden");
    expect(body).toContain("overflow-x: hidden");
    expect(root).toContain("overflow-x: hidden");
  });

  it("keeps the admin shell pinned to the viewport instead of creating page overflow", () => {
    const css = readStyle("admin.css");
    const shell = ruleBody(css, ".admin-shell");
    const workspace = ruleBody(css, ".admin-workspace");

    expect(shell).toContain("overflow-x: hidden");
    expect(shell).toContain("width: 100%");
    expect(workspace).toContain("overflow-x: hidden");
  });

  it("pins printer settings controls to stable columns", () => {
    const css = readStyle("settings.css");
    const panel = ruleBody(css, ".printer-settings-page .settings-panel");
    const message = ruleBody(css, ".printer-settings-page .save-message");
    const row = ruleBody(css, ".printer-settings-page .setting-row");
    const footer = ruleBody(css, ".printer-settings-page .settings-panel footer");
    const footerButton = ruleBody(css, ".printer-settings-page .settings-panel footer button");
    const toggle = ruleBody(css, ".printer-settings-page .toggle");

    expect(panel).toContain("width: min(100%, 680px)");
    expect(message).toContain("width: min(100%, 680px)");
    expect(row).toContain("grid-template-columns: minmax(0, 1fr) 42px");
    expect(footer).toContain("grid-template-columns: 156px 156px");
    expect(footerButton).toContain("width: 156px");
    expect(toggle).toContain("flex: 0 0 42px");
  });
});
