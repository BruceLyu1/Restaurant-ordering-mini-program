export function money(value: number): string {
  if (!Number.isFinite(value)) return "HK$ --";
  return `HK$ ${value.toLocaleString("zh-HK")}`;
}
