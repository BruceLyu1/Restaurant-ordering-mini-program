
import React from "react";

interface MetricProps {
  label: string;
  value: string;
  note?: string;
}

export function Metric({ label, value, note }: MetricProps) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
