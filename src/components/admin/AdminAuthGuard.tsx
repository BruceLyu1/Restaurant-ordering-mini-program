import React, { useEffect, useState } from "react";
import { useTranslation } from "../../i18n/useTranslation";
import { getDataSourceMode } from "../../services/dataSource";
import { useAuthStore } from "../../stores/authStore";
import { PinGuard } from "./PinGuard";

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { t } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const authError = useAuthStore((state) => state.error);
  const loadSession = useAuthStore((state) => state.loadSession);
  const signIn = useAuthStore((state) => state.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getDataSourceMode() !== "supabase") return;
    if (status !== "loading") return;
    void loadSession().catch(() => undefined);
  }, [loadSession, status]);

  if (getDataSourceMode() !== "supabase") {
    return <PinGuard>{children}</PinGuard>;
  }

  if (status === "signed-in") return <>{children}</>;

  if (status === "loading") {
    return (
      <main className="pin-guard">
        <section aria-busy="true" className="pin-card admin-auth-card">
          <h1>{t("adminAuth.title")}</h1>
          <p role="status">{t("adminAuth.loading")}</p>
        </section>
      </main>
    );
  }

  const errorMessage = authError
    ? t(`adminAuth.errors.${authError}`)
    : status === "unauthorized"
      ? t("adminAuth.errors.unauthorized")
      : "";

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch {
      // authStore exposes a safe, localized category for the failed request.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="pin-guard">
      <section className="pin-card admin-auth-card">
        <h1>{t("adminAuth.title")}</h1>
        <p>{t("adminAuth.description")}</p>
        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label>
            <span>{t("adminAuth.email")}</span>
            <input
              aria-label={t("adminAuth.email")}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>{t("adminAuth.password")}</span>
            <input
              aria-label={t("adminAuth.password")}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>
          <span className="pin-error" role={errorMessage ? "alert" : undefined}>
            {errorMessage}
          </span>
          <button className="management-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("adminAuth.signingIn") : t("adminAuth.signIn")}
          </button>
        </form>
      </section>
    </main>
  );
}
