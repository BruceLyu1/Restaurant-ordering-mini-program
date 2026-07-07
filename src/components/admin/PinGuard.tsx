import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { useSettingsStore } from "../../stores/settingsStore";

interface PinGuardProps {
  children: React.ReactNode;
}

const PIN_LENGTH = 6;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000;
const SESSION_KEY = "harbour-admin-unlocked";
const ATTEMPTS_KEY = "harbour-admin-pin-attempts";
const LOCKED_UNTIL_KEY = "harbour-admin-pin-locked-until";

function createEmptyDigits(): string[] {
  return Array.from({ length: PIN_LENGTH }, () => "");
}

function readNumberFromSession(key: string): number {
  const value = Number(window.sessionStorage.getItem(key));
  return Number.isFinite(value) ? value : 0;
}

function readLockedUntilFromSession(): number {
  const lockedUntil = readNumberFromSession(LOCKED_UNTIL_KEY);
  if (lockedUntil > Date.now()) return lockedUntil;

  window.sessionStorage.removeItem(ATTEMPTS_KEY);
  window.sessionStorage.removeItem(LOCKED_UNTIL_KEY);
  return 0;
}

function pinsMatch(first: string, second: string): boolean {
  let diff = first.length === second.length ? 0 : 1;
  for (let index = 0; index < PIN_LENGTH; index += 1) {
    diff |= (first.charCodeAt(index) || 0) ^ (second.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export function PinGuard({ children }: PinGuardProps) {
  const { t } = useTranslation();
  const pin = useSettingsStore((state) => state.restaurant.pin);
  const [unlocked, setUnlocked] = useState(() => window.sessionStorage.getItem(SESSION_KEY) === "1");
  const [digits, setDigits] = useState<string[]>(createEmptyDigits);
  const [error, setError] = useState("");
  const [lockedUntil, setLockedUntil] = useState(readLockedUntilFromSession);
  const [failedAttempts, setFailedAttempts] = useState(() => (
    lockedUntil > Date.now() ? readNumberFromSession(ATTEMPTS_KEY) : 0
  ));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const isLocked = lockedUntil > Date.now();

  const unlock = useCallback(() => {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    window.sessionStorage.removeItem(ATTEMPTS_KEY);
    window.sessionStorage.removeItem(LOCKED_UNTIL_KEY);
    setFailedAttempts(0);
    setLockedUntil(0);
    setUnlocked(true);
  }, []);

  const reset = useCallback(() => {
    setDigits(createEmptyDigits());
    setError(lockedUntil > Date.now() ? t("adminApp.pin.locked", { minutes: 5 }) : "");
    window.setTimeout(() => inputs.current[0]?.focus(), 0);
  }, [lockedUntil, t]);

  const verifyPin = useCallback((value: string) => {
    if (lockedUntil > Date.now()) {
      setError(t("adminApp.pin.locked", { minutes: 5 }));
      return;
    }

    if (pinsMatch(value, pin)) {
      unlock();
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    window.sessionStorage.setItem(ATTEMPTS_KEY, String(nextAttempts));

    if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
      const nextLockedUntil = Date.now() + LOCK_DURATION_MS;
      setLockedUntil(nextLockedUntil);
      window.sessionStorage.setItem(LOCKED_UNTIL_KEY, String(nextLockedUntil));
      setError(t("adminApp.pin.locked", { minutes: 5 }));
      setDigits(createEmptyDigits());
      return;
    }

    setError(t("adminApp.pin.incorrect"));
    window.setTimeout(reset, 600);
  }, [failedAttempts, lockedUntil, pin, reset, t, unlock]);

  const handleChange = useCallback((index: number, value: string) => {
    if (lockedUntil > Date.now()) return;
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
  }, [digits, lockedUntil, verifyPin]);

  const handleKeyDown = useCallback((index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (lockedUntil > Date.now()) return;
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
  }, [lockedUntil, verifyPin]);

  useEffect(() => {
    if (!isLocked) return undefined;

    setError(t("adminApp.pin.locked", { minutes: 5 }));
    const timeoutId = window.setTimeout(() => {
      window.sessionStorage.removeItem(ATTEMPTS_KEY);
      window.sessionStorage.removeItem(LOCKED_UNTIL_KEY);
      setFailedAttempts(0);
      setLockedUntil(0);
      setError("");
      setDigits(createEmptyDigits());
      window.setTimeout(() => inputs.current[0]?.focus(), 0);
    }, Math.max(lockedUntil - Date.now(), 0));

    return () => window.clearTimeout(timeoutId);
  }, [isLocked, lockedUntil, t]);

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
              disabled={isLocked}
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
