import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../i18n/LanguageContext";
import * as menuService from "../../services/menuService";
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

const secondMenuItem: MenuItem = {
  ...menuItem,
  id: "shrimp-dumpling",
  name: "Shrimp Dumpling",
};

const soldOutMenuItem: MenuItem = {
  ...menuItem,
  soldOut: true,
};

const secondSoldOutMenuItem: MenuItem = {
  ...secondMenuItem,
  soldOut: true,
};

function renderMenuManagement(items: MenuItem[] = [menuItem], language = "zh-Hant") {
  window.localStorage.setItem("harbour-language", language);
  useMenuStore.setState({ items });
  render(
    <LanguageProvider>
      <MenuManagement />
    </LanguageProvider>,
  );
}

describe("MenuManagement", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_DATA_SOURCE", "local");
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

  it("uploads data URL photos before saving edited dishes", async () => {
    const remoteUrl = "https://cdn.test/dish-photos/menu/dish.jpg";
    const upload = vi.spyOn(menuService, "uploadDishPhotoAsync").mockResolvedValue(remoteUrl);

    renderMenuManagement([{ ...menuItem, imageUrl: "data:image/jpeg;base64,aGVsbG8=" }]);

    fireEvent.click(screen.getByRole("button", { name: "修改" }));
    fireEvent.click(screen.getByRole("button", { name: "儲存修改" }));

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith("data:image/jpeg;base64,aGVsbG8=");
      expect(useMenuStore.getState().items[0].imageUrl).toBe(remoteUrl);
    });
  });

  it("shows a save error when photo upload fails", async () => {
    vi.spyOn(menuService, "uploadDishPhotoAsync").mockRejectedValue(new Error("upload failed"));

    renderMenuManagement([{ ...menuItem, imageUrl: "data:image/jpeg;base64,aGVsbG8=" }], "en");

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(screen.getByText("Menu save failed. Please try again.")).toBeTruthy();
    });
  });

  it("keeps sold-out toggles clickable while another toggle save is pending", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    let resolveSave: () => void = () => undefined;
    vi.spyOn(menuService, "saveMenuItemsAsync")
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        resolveSave = resolve;
      }))
      .mockResolvedValue(undefined);

    renderMenuManagement([menuItem, secondMenuItem], "en");

    const firstToggle = screen.getByRole("button", { name: `Toggle sold-out status for ${menuItem.name}` });
    const secondToggle = screen.getByRole("button", { name: "Toggle sold-out status for Shrimp Dumpling" });

    fireEvent.click(firstToggle);
    await waitFor(() => expect(firstToggle.getAttribute("aria-pressed")).toBe("true"));

    expect(secondToggle.hasAttribute("disabled")).toBe(false);
    fireEvent.click(secondToggle);

    await waitFor(() => expect(secondToggle.getAttribute("aria-pressed")).toBe("true"));
    resolveSave();
  });

  it("keeps sold-out toggles clickable when rapidly restoring multiple dishes", async () => {
    vi.stubEnv("VITE_DATA_SOURCE", "supabase");
    let resolveSave: () => void = () => undefined;
    vi.spyOn(menuService, "saveMenuItemsAsync")
      .mockImplementationOnce(() => new Promise<void>((resolve) => {
        resolveSave = resolve;
      }))
      .mockResolvedValue(undefined);

    renderMenuManagement([soldOutMenuItem, secondSoldOutMenuItem], "en");

    const firstToggle = screen.getByRole("button", { name: `Toggle sold-out status for ${menuItem.name}` });
    const secondToggle = screen.getByRole("button", { name: "Toggle sold-out status for Shrimp Dumpling" });

    fireEvent.click(firstToggle);
    await waitFor(() => expect(firstToggle.getAttribute("aria-pressed")).toBe("false"));

    expect(secondToggle.hasAttribute("disabled")).toBe(false);
    fireEvent.click(secondToggle);

    await waitFor(() => expect(secondToggle.getAttribute("aria-pressed")).toBe("false"));
    resolveSave();
  });
});
