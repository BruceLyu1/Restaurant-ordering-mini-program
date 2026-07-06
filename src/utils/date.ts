export function isSameLocalDate(dateString: string, date: Date = new Date()): boolean {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime()) || Number.isNaN(date.getTime())) return false;
  return (
    value.getFullYear() === date.getFullYear() &&
    value.getMonth() === date.getMonth() &&
    value.getDate() === date.getDate()
  );
}

export function formatTime(dateString: string): string {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return "--:--";
  return new Intl.DateTimeFormat("zh-HK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}
