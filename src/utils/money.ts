export function money(value: number): string {
  return `HK$ ${value.toLocaleString("zh-HK")}`;
}
