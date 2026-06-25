import React from "react";
import { useTranslation } from "../../i18n/useTranslation";

interface SectionHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, description, action }: SectionHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="section-header">
      <div>
        <p>{t("ui.sectionHeader.breadcrumb")}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action}
    </header>
  );
}
