
import React, { useEffect, useState } from "react";
import type { MenuItem } from "../../types";

interface DishImageProps {
  item: MenuItem;
  size?: "normal" | "small" | "tiny";
}

export const DishImage = React.memo(function DishImage({ item, size = "normal" }: DishImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasPhoto = Boolean(item.imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [item.imageUrl]);

  return (
    <span
      aria-label={item.name}
      className={`dish-image ${size} ${hasPhoto ? "has-photo" : "empty"}`}
      role="img"
      style={hasPhoto ? {
        backgroundImage: `url(${JSON.stringify(item.imageUrl)})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      } : undefined}
    >
      {item.imageUrl && !imageFailed && (
        <img alt={item.name} aria-hidden="true" onError={() => setImageFailed(true)} src={item.imageUrl} />
      )}
      {!hasPhoto && item.name.slice(0, 1)}
    </span>
  );
});
