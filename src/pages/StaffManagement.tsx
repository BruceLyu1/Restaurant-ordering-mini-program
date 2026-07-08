import React, { useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Toggle } from "../components/ui/Toggle";
import { useTranslation } from "../i18n/useTranslation";
import { getStaffRoleLabelKey } from "../services/staffService";
import { useStaffStore } from "../stores/staffStore";

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
  const toggleActive = useStaffStore((state) => state.toggleActive);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ email: "", name: "", role: DEFAULT_ROLE });

  async function addStaff(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!draft.name.trim() || !draft.email.trim()) return;

    try {
      await add({ active: true, email: draft.email.trim(), name: draft.name.trim(), role: draft.role });
      setDraft({ email: "", name: "", role: DEFAULT_ROLE });
      setShowForm(false);
    } catch (error) {
      console.error("Save staff failed", error);
    }
  }

  function toggleStaffActive(id: number): void {
    void toggleActive(id).catch((error) => console.error("Save staff status failed", error));
  }

  return (
    <section className="management-page">
      <SectionHeader
        action={<button className="management-primary" onClick={() => setShowForm(true)} type="button">{t("staffManagement.add")}</button>}
        description={t("staffManagement.description")}
        title={t("staffManagement.title")}
      />
      {showForm && (
        <form className="inline-form" onSubmit={addStaff}>
          <input aria-label={t("staffManagement.name")} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("staffManagement.name")} value={draft.name} />
          <input aria-label={t("staffManagement.email")} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder={t("staffManagement.email")} type="email" value={draft.email} />
          <select aria-label={t("staffManagement.role")} onChange={(event) => setDraft({ ...draft, role: event.target.value })} value={draft.role}>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{t(role.labelKey)}</option>)}
          </select>
          <button className="management-primary" type="submit">{t("staffManagement.createAccount")}</button>
          <button className="management-secondary" onClick={() => setShowForm(false)} type="button">{t("common.cancel")}</button>
        </form>
      )}
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead><tr><th>{t("staffManagement.table.staff")}</th><th>{t("staffManagement.table.email")}</th><th>{t("staffManagement.table.role")}</th><th>{t("staffManagement.table.status")}</th><th>{t("staffManagement.table.enabled")}</th></tr></thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id}>
                <td><strong>{member.name}</strong></td>
                <td>{member.email || "-"}</td>
                <td>{t(getStaffRoleLabelKey(member.role))}</td>
                <td><span className={`list-status ${member.active ? "active" : "inactive"}`}>{member.active ? t("staffManagement.active") : t("staffManagement.inactive")}</span></td>
                <td><Toggle checked={member.active} label={t("staffManagement.toggle", { name: member.name })} onChange={() => toggleStaffActive(member.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
