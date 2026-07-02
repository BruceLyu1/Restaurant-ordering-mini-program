import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("cart mobile input styles", () => {
  it("keeps note inputs at 16px or larger to prevent iOS text-field zoom", () => {
    const css = readFileSync(resolve(__dirname, "../cart.css"), "utf8");
    const rule = css.match(/\.cart-item-notes-input\s*\{(?<body>[^}]+)\}/);
    const fontSize = rule?.groups?.body.match(/font-size:\s*(?<size>\d+)px/);

    expect(Number(fontSize?.groups?.size)).toBeGreaterThanOrEqual(16);
  });
});
