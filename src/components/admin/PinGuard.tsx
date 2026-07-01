import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { useSettingsStore } from "../../stores/settingsStore";

interface PinGuardProps {
  children: React.ReactNode;
}

const PIN_LENGTH = 6;
const SESSION_KEY = "harbour-admin-unlocked";

function createEmptyDigits(): string[] {
  return Array.from({ length: PIN_LENGTH }, () => "");
}

export function PinGuard({ children }: PinGuardProps) {
  const { t } = useTranslation();
  const pin = useSettingsStore((state) => state.restaurant.pin);
  const [unlocked, setUnlocked] = useState(() => window.sessionStorage.getItem(SESSION_KEY) === "1");
  const [digits, setDigits] = useState<string[]>(createEmptyDigits);
  const [error, setError] = useState("");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const unlock = useCallback(() => {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setUnlocked(true);
  }, []);

  const reset = useCallback(() => {
    setDigits(createEmptyDigits());
    setError("");
    window.setTimeout(() => inputs.current[0]?.focus(), 0);
  }, []);

  const verifyPin = useCallback((value: string) => {
    if (value === pin) {
      unlock();
      return;
    }

    setError(t("adminApp.pin.incorrect"));
    window.setTimeout(reset, 600);
  }, [pin, reset, t, unlock]);

  const handleChange = useCallback((index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError("");

    if (value && index < PIN_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    const fullPin = next.join("");
    if (fullPin.length === PIN_LENGTH && next.every(Boolean)) {
      verifyPin(fullPin);
    }
  }, [digits, verifyPin]);

  const handleKeyDown = useCallback((index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, PIN_LENGTH);
    if (!pasted) return;

    const next = createEmptyDigits();
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setDigits(next);
    setError("");

    if (pasted.length === PIN_LENGTH) {
      verifyPin(pasted);
    } else {
      inputs.current[pasted.length]?.focus();
    }
  }, [verifyPin]);

  useEffect(() => {
    if (!unlocked) {
      inputs.current[0]?.focus();
    }
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  return (
    <main className="pin-guard">
      <section className="pin-card">
        <h1>{t("adminApp.pin.title")}</h1>
        <p>{t("adminApp.pin.description")}</p>
        <div className="pin-digits" data-testid="pin-digits" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              aria-label={t("adminApp.pin.digitLabel", { position: index + 1 })}
              autoComplete="off"
              className={`pin-digit ${error ? "pin-digit-error" : ""}`}
              inputMode="numeric"
              key={index}
              maxLength={1}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              ref={(element) => {
                inputs.current[index] = element;
              }}
              type="text"
              value={digit}
            />
          ))}
        </div>
        {error && <span className="pin-error">{error}</span>}
        <button className="management-secondary" onClick={reset} type="button">
          {t("adminApp.pin.reset")}
        </button>
      </section>
    </main>
  );
}
