import React from "react";
import { render, screen } from "@testing-library/react";
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
});
