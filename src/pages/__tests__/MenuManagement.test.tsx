import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import { useMenuStore } from "../../stores/menuStore";
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

function renderMenuManagement() {
  window.localStorage.setItem("harbour-language", "zh-Hant");
  useMenuStore.setState({ items: [menuItem] });
  render(
    <LanguageProvider>
      <MenuManagement />
    </LanguageProvider>,
  );
}

describe("MenuManagement", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useMenuStore.setState({ items: [menuItem] });
  });

  it("renders the menu table without runtime reference errors", () => {
    renderMenuManagement();

    expect(screen.getByRole("heading", { name: "菜單管理" })).toBeTruthy();
    expect(screen.getByText("HK$ 68")).toBeTruthy();
  });

  it("saves descriptions when creating dishes", () => {
    renderMenuManagement();

    fireEvent.click(screen.getByRole("button", { name: "新增菜品" }));
    fireEvent.change(screen.getByLabelText("菜品名稱"), { target: { value: "Test Dish" } });
    fireEvent.change(screen.getByLabelText("價格"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("菜品描述"), { target: { value: "Crisp and fresh" } });
    fireEvent.click(screen.getByRole("button", { name: "儲存菜品" }));

    expect(useMenuStore.getState().items.at(-1)?.description).toBe("Crisp and fresh");
  });

  it("shows translated image validation errors", async () => {
    renderMenuManagement();

    fireEvent.click(screen.getByRole("button", { name: "新增菜品" }));
    fireEvent.change(screen.getByLabelText("上傳菜品照片"), {
      target: { files: [new File(["not-image"], "notes.txt", { type: "text/plain" })] },
    });

    await waitFor(() => {
      expect(screen.getByText("請選擇圖片檔案。")).toBeTruthy();
    });
  });
});
