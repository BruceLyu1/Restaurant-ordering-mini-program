export const SETTINGS_STORAGE_KEY = "harbour-admin-settings";
export const SETTINGS_CHANGE_EVENT = "harbour-settings-change";

export const DEFAULT_MEAL_PERIODS = [
  { id: "breakfast", name: "早餐", start: "07:00", end: "11:00" },
  { id: "lunch", name: "午市", start: "11:00", end: "17:00" },
  { id: "dinner", name: "晚市", start: "17:00", end: "23:59" },
];

export const DEFAULT_RESTAURANT_SETTINGS = {
  name: "海港小館",
  phone: "2188 6688",
  address: "香港灣仔軒尼詩道 88 號",
  language: "繁體中文",
  mealPeriods: DEFAULT_MEAL_PERIODS,
};

function normalizeMealPeriods(mealPeriods) {
  const savedPeriods = Array.isArray(mealPeriods) ? mealPeriods : [];

  return DEFAULT_MEAL_PERIODS.map((defaultPeriod) => ({
    ...defaultPeriod,
    ...savedPeriods.find((period) => period.id === defaultPeriod.id),
  }));
}

export function loadRestaurantSettings() {
  const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!saved) return DEFAULT_RESTAURANT_SETTINGS;

  try {
    const settings = JSON.parse(saved);
    return {
      ...DEFAULT_RESTAURANT_SETTINGS,
      ...settings,
      mealPeriods: normalizeMealPeriods(settings.mealPeriods),
    };
  } catch {
    return DEFAULT_RESTAURANT_SETTINGS;
  }
}

export function saveRestaurantSettings(settings) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGE_EVENT));
}

function timeToMinutes(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function getCurrentMealPeriod(settings, date = new Date()) {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  return settings.mealPeriods.find((period) => {
    const start = timeToMinutes(period.start);
    const end = timeToMinutes(period.end);
    if (start === null || end === null) return false;
    return start <= end
      ? currentMinutes >= start && currentMinutes < end
      : currentMinutes >= start || currentMinutes < end;
  }) || null;
}

export function isItemAvailableForMealPeriod(item, mealPeriod) {
  if (!mealPeriod) return false;
  return !Array.isArray(item.mealPeriods) || item.mealPeriods.includes(mealPeriod.id);
}

export function formatAdminDate(date = new Date()) {
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`;
}
