
import React from "react";

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}

export function Toggle({ checked, disabled = false, onChange, label }: ToggleProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={checked}
      className={`toggle ${checked ? "enabled" : ""}`}
      disabled={disabled}
      onClick={onChange}
      type="button"
    >
      <span />
    </button>
  );
}
