
export const CATEGORY_ALIASES: Record<string, string> = {
  饭类: "飯類",
  点心: "點心",
  面类: "麵類",
  饮品: "飲品",
};

export function normalizeCategoryName(category: string): string {
  const trimmed = category.trim();
  return CATEGORY_ALIASES[trimmed] || trimmed;
}
