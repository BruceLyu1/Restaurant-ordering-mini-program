
import React from "react";
import type { MenuItem } from "../../types";

interface DishImageProps {
  item: MenuItem;
  size?: "normal" | "small" | "tiny";
}

export const DishImage = React.memo(function DishImage({ item, size = "normal" }: DishImageProps) {
  const hasPhoto = Boolean(item.imageUrl);
  return (
    <span
      aria-label={item.name}
      className={`dish-image ${size} ${hasPhoto ? "has-photo" : ""}`}
      role="img"
      style={hasPhoto ? {
        backgroundImage: `url(${JSON.stringify(item.imageUrl)})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      } : undefined}
    >
      {!hasPhoto && item.name.slice(0, 1)}
    </span>
  );
});
