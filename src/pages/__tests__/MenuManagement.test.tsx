import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { MenuManagement } from "../MenuManagement";
import type { MenuItem } from "../../types";

const menuItem: MenuItem = {
  category: "飯類",
  deleted: false,
  description: "明爐叉燒、時蔬、香米飯",
  id: "char-siu",
  imageUrl: "/dish-photos/char-siu.jpg",
  mealPeriods: ["lunch"],
  name: "蜜汁叉燒飯",
  price: 68,
  soldOut: false,
};

function renderMenuManagement(setItems = vi.fn()) {
  window.localStorage.setItem("harbour-language", "zh-Hant");
  render(
    <LanguageProvider>
      <MenuManagement items={[menuItem]} setItems={setItems} />
    </LanguageProvider>,
  );
  return setItems;
}

describe("MenuManagement", () => {
  it("renders the menu table without runtime reference errors", () => {
    renderMenuManagement();

    expect(screen.getByRole("heading", { name: "菜單管理" })).toBeTruthy();
    expect(screen.getByText("HK$ 68")).toBeTruthy();
  });

  it("saves descriptions when creating dishes", () => {
    const setItems = renderMenuManagement();

    fireEvent.click(screen.getByRole("button", { name: "新增菜品" }));
    fireEvent.change(screen.getByLabelText("菜品名稱"), { target: { value: "Test Dish" } });
    fireEvent.change(screen.getByLabelText("價格"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("菜品描述"), { target: { value: "Crisp and fresh" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存菜品" }));

    const updater = setItems.mock.calls.at(-1)?.[0];
    expect(typeof updater).toBe("function");
    expect(updater([])[0].description).toBe("Crisp and fresh");
  });
});
