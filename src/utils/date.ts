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

export function formatDateTime(dateString: string): string {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return "---- -- --:--";

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${formatTime(dateString)}`;
}

function getHongKongDateParts(date: Date): { day: string; month: string; year: string } | null {
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;
  return day && month && year ? { day, month, year } : null;
}

export function isSameHongKongDate(dateString: string, date: Date = new Date()): boolean {
  const value = new Date(dateString);
  const settlementDate = getHongKongDateParts(value);
  const currentDate = getHongKongDateParts(date);
  return Boolean(
    settlementDate &&
      currentDate &&
      settlementDate.year === currentDate.year &&
      settlementDate.month === currentDate.month &&
      settlementDate.day === currentDate.day,
  );
}
