import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DishImage } from "../DishImage";

describe("DishImage", () => {
  it("uses the customer menu image class from the stylesheet", () => {
    render(<DishImage item={{
      category: "飯類",
      description: "明爐叉燒、時蔬、香米飯",
      id: "char-siu",
      imageUrl: "/dish-photos/char-siu.jpg",
      name: "蜜汁叉燒飯",
      price: 68,
      soldOut: false,
    }} />);

    expect(screen.getByRole("img", { name: "蜜汁叉燒飯" }).classList.contains("dish-image")).toBe(true);
  });

  it("shows the dish initial when the image URL fails to load", () => {
    render(<DishImage item={{
      category: "Rice",
      description: "Char siu and rice",
      id: "char-siu",
      imageUrl: "/missing.jpg",
      name: "Char Siu Rice",
      price: 68,
      soldOut: false,
    }} />);

    fireEvent.error(screen.getByAltText("Char Siu Rice"));

    expect(screen.getByRole("img", { name: "Char Siu Rice" }).textContent).toBe("C");
  });
});
