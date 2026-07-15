import React, { useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Toggle } from "../components/ui/Toggle";
import { useTranslation } from "../i18n/useTranslation";
import { getDataSourceMode } from "../services/dataSource";
import {
  createStaffAccount,
} from "../services/staffAccountService";
import { getStaffRoleLabelKey, normalizeStaffRole } from "../services/staffService";
import { useAuthStore } from "../stores/authStore";
import { useStaffStore } from "../stores/staffStore";
import type { StaffMember } from "../types";

const DEFAULT_ROLE = "floor";
const ROLE_OPTIONS = [
  { labelKey: "staffManagement.roles.floor", value: DEFAULT_ROLE },
  { labelKey: "staffManagement.roles.cashier", value: "cashier" },
  { labelKey: "staffManagement.roles.manager", value: "manager" },
];

export function StaffManagement() {
  const { t } = useTranslation();
  const staff = useStaffStore((state) => state.staff);
  const add = useStaffStore((state) => state.add);
  const load = useStaffStore((state) => state.load);
  const toggleActive = useStaffStore((state) => state.toggleActive);
  const currentStaff = useAuthStore((state) => state.staffProfile);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "", password: "", role: DEFAULT_ROLE });
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [togglingStaffIds, setTogglingStaffIds] = useState<Set<number>>(() => new Set());
  const isSupabaseMode = getDataSourceMode() === "supabase";

  async function addStaff(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim() || (isSupabaseMode && !draft.password)) return;

    try {
      setAccountError("");
      setAccountMessage("");
      setSaveError("");
      setCreatingAccount(true);
      if (isSupabaseMode) {
        const email = draft.email.trim();
        await createStaffAccount({
          email,
          name: draft.name.trim(),
          password: draft.password,
          role: draft.role,
        });
        await load();
        setAccountMessage(t("staffManagement.account.created", { email }));
      } else {
        await add({ active: true, email: draft.email.trim(), name: draft.name.trim(), role: draft.role });
      }
      setDraft({ email: "", name: "", password: "", role: DEFAULT_ROLE });
      setShowForm(false);
    } catch (error) {
      console.error("Create staff account failed", error);
      const message = error instanceof Error && error.message ? error.message : t("staffManagement.saveFailed");
      if (isSupabaseMode) setAccountError(message);
      else setSaveError(t("staffManagement.saveFailed"));
    } finally {
      setCreatingAccount(false);
    }
  }

  function isCurrentStaff(member: StaffMember): boolean {
    if (!currentStaff) return false;
    if (member.authUserId && currentStaff.authUserId) return member.authUserId === currentStaff.authUserId;
    if (member.email && currentStaff.email) return member.email.toLowerCase() === currentStaff.email.toLowerCase();
    return member.id === currentStaff.id;
  }

  function getActiveManagerCount(): number {
    return staff.filter((member) => member.active && normalizeStaffRole(member.role) === "manager").length;
  }

  function getStaffStatusClass(member: { active: boolean; authUserId?: string | null }): string {
    if (!member.active) return "inactive";
    return member.authUserId === null || member.authUserId === undefined ? "inactive" : "active";
  }

  async function toggleStaffActive(member: StaffMember): Promise<void> {
    if (togglingStaffIds.has(member.id)) return;

    const isManager = normalizeStaffRole(member.role) === "manager";
    if (member.active && isManager && isCurrentStaff(member)) {
      setSaveError(t("staffManagement.cannotDisableCurrentManager"));
      return;
    }
    if (member.active && isManager && getActiveManagerCount() <= 1) {
      setSaveError(t("staffManagement.cannotDisableLastManager"));
      return;
    }

    setSaveError("");
    setTogglingStaffIds((current) => new Set(current).add(member.id));
    try {
      await toggleActive(member.id);
    } catch (error) {
      console.error("Save staff status failed", error);
      setSaveError(t("staffManagement.saveFailed"));
    } finally {
      setTogglingStaffIds((current) => {
        const next = new Set(current);
        next.delete(member.id);
        return next;
      });
    }
  }

  function getAccountStatus(member: { active: boolean; authUserId?: string | null }): string {
    if (!member.active) return t("staffManagement.account.disabled");
    return member.authUserId ? t("staffManagement.account.linked") : t("staffManagement.account.notLinked");
  }

  return (
    <section className="management-page">
      <SectionHeader
        action={<button className="management-primary" onClick={() => setShowForm(true)} type="button">{t("staffManagement.add")}</button>}
        description={t("staffManagement.description")}
        title={t("staffManagement.title")}
      />
      {accountMessage && <p className="save-message" role="status">{accountMessage}</p>}
      {accountError && <p className="save-message error" role="alert">{accountError}</p>}
      {saveError && <p className="save-message error" role="alert">{saveError}</p>}
      {showForm && (
        <form className="inline-form" onSubmit={addStaff}>
          <input aria-label={t("staffManagement.name")} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("staffManagement.name")} value={draft.name} />
          <input aria-label={t("staffManagement.email")} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder={t("staffManagement.email")} type="email" value={draft.email} />
          {isSupabaseMode && (
            <input aria-label={t("staffManagement.password")} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder={t("staffManagement.password")} type="password" value={draft.password} />
          )}
          <select aria-label={t("staffManagement.role")} onChange={(event) => setDraft({ ...draft, role: event.target.value })} value={draft.role}>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{t(role.labelKey)}</option>)}
          </select>
          <button className="management-primary" disabled={creatingAccount} type="submit">
            {isSupabaseMode ? t("staffManagement.createAccount") : t("staffManagement.createProfile")}
          </button>
          <button className="management-secondary" onClick={() => setShowForm(false)} type="button">{t("common.cancel")}</button>
        </form>
      )}
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead>
            <tr>
              <th>{t("staffManagement.table.staff")}</th>
              <th>{t("staffManagement.table.email")}</th>
              <th>{t("staffManagement.table.role")}</th>
              <th>{t("staffManagement.table.status")}</th>
              {isSupabaseMode && <th>{t("staffManagement.table.account")}</th>}
              <th>{t("staffManagement.table.enabled")}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td><strong>{member.name}</strong></td>
                <td>{member.email || "-"}</td>
                <td>{t(getStaffRoleLabelKey(member.role))}</td>
                <td><span className={`list-status ${member.active ? "active" : "inactive"}`}>{member.active ? t("staffManagement.active") : t("staffManagement.inactive")}</span></td>
                {isSupabaseMode && (
                  <td><span className={`list-status ${getStaffStatusClass(member)}`}>{getAccountStatus(member)}</span></td>
                )}
                <td><Toggle checked={member.active} disabled={togglingStaffIds.has(member.id)} label={t("staffManagement.toggle", { name: member.name })} onChange={() => void toggleStaffActive(member)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
