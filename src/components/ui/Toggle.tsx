
import React from "react";

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={`toggle ${checked ? "enabled" : ""}`}
      onClick={onChange}
      type="button"
    >
      <span />
    </button>
  );
}
