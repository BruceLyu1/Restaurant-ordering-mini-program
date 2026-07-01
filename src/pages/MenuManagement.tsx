import React, { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Toggle } from "../components/ui/Toggle";
import { useTranslation } from "../i18n/useTranslation";
import { DEFAULT_MEAL_PERIODS } from "../services/settingsService";
import { useMenuStore } from "../stores/menuStore";
import { normalizeCategoryName } from "../utils/category";
import { compressDishPhoto, ImageError } from "../utils/image";
import { money } from "../utils/money";
import type { MenuItem } from "../types";

interface MenuItemDraft {
  category: string;
  customCategory: string;
  description: string;
  imageUrl: string;
  mealPeriods: string[];
  name: string;
  price: string;
}

const ALL_CATEGORIES = "__all";
const CUSTOM_CATEGORY = "__custom";

function createEmptyDraft(category: string, mealPeriods: string[]): MenuItemDraft {
  return {
    category,
    customCategory: "",
    description: "",
    imageUrl: "",
    mealPeriods,
    name: "",
    price: "",
  };
}

export function MenuManagement() {
  const { t } = useTranslation();
  const items = useMenuStore((state) => state.items);
  const setItems = useMenuStore((state) => state.updateItems);
  const toggleSoldOut = useMenuStore((state) => state.toggleSoldOut);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryTarget, setCategoryTarget] = useState("");
  const [categoryNotice, setCategoryNotice] = useState("");
  const allMealPeriodIds = DEFAULT_MEAL_PERIODS.map((period) => period.id);
  const activeItems = useMemo(() => items.filter((item) => !item.deleted), [items]);
  const categories = useMemo(
    () => [...new Set(activeItems.map((item) => normalizeCategoryName(item.category || "")).filter(Boolean))],
    [activeItems],
  );
  const defaultCategory = categories[0] || "飯類";
  const [draft, setDraft] = useState<MenuItemDraft>(() => createEmptyDraft(defaultCategory, allMealPeriodIds));
  const [categoryError, setCategoryError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [periodError, setPeriodError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const visible = activeItems.filter((item) => (
    item.name.includes(query.trim()) &&
    (categoryFilter === ALL_CATEGORIES || normalizeCategoryName(item.category || "") === categoryFilter)
  ));

  useEffect(() => {
    let changed = false;
    const normalizedItems = items.map((item) => {
      const normalizedCategory = normalizeCategoryName(item.category || "");
      if (normalizedCategory && normalizedCategory !== item.category) {
        changed = true;
        return { ...item, category: normalizedCategory };
      }
      return item;
    });

    if (changed) {
      setItems(normalizedItems);
      setCategoryNotice(t("menuManagement.categoryMergeNotice"));
    }
  }, [items, setItems, t]);

  useEffect(() => {
    if (categoryFilter !== ALL_CATEGORIES && !categories.includes(categoryFilter)) {
      setCategoryFilter(ALL_CATEGORIES);
    }
    if (categoryTarget && !categories.includes(categoryTarget)) {
      setCategoryTarget("");
      setCategoryDraft("");
    }
  }, [categories, categoryFilter, categoryTarget]);

  function resetForm(): void {
    setDraft(createEmptyDraft(defaultCategory, allMealPeriodIds));
    setCategoryError("");
    setEditingId(null);
    setPhotoError("");
    setPeriodError("");
    setShowForm(false);
  }

  function createItem(): void {
    setDraft(createEmptyDraft(defaultCategory, allMealPeriodIds));
    setCategoryError("");
    setEditingId(null);
    setPhotoError("");
    setPeriodError("");
    setShowForm(true);
  }

  function editItem(item: MenuItem): void {
    setDraft({
      category: item.category,
      customCategory: "",
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      mealPeriods: Array.isArray(item.mealPeriods) ? item.mealPeriods : allMealPeriodIds,
      name: item.name,
      price: String(item.price),
    });
    setCategoryError("");
    setEditingId(item.id);
    setPhotoError("");
    setPeriodError("");
    setShowForm(true);
  }

  function selectCategoryForEdit(category: string): void {
    setCategoryTarget(category);
    setCategoryDraft(category);
    setCategoryNotice("");
  }

  function renameCategory(): void {
    const from = categoryTarget;
    const to = normalizeCategoryName(categoryDraft);
    if (!from || !to) {
      setCategoryNotice(t("menuManagement.validationCategory"));
      return;
    }
    if (to === ALL_CATEGORIES || to === CUSTOM_CATEGORY) {
      setCategoryNotice(t("menuManagement.invalidCategoryName"));
      return;
    }

    const affectedCount = activeItems.filter((item) => normalizeCategoryName(item.category || "") === from).length;
    setItems((current) => current.map((item) => (
      normalizeCategoryName(item.category || "") === from ? { ...item, category: to } : item
    )));
    setCategoryFilter(to);
    setCategoryTarget(to);
    setCategoryDraft(to);
    setCategoryNotice(from === to
      ? t("menuManagement.categoryRenameNoChange")
      : t("menuManagement.categoryRenamed", { count: affectedCount, from, to }));
  }

  function deleteCategory(): void {
    const category = categoryTarget;
    if (!category) {
      setCategoryNotice(t("menuManagement.chooseCategoryFirst"));
      return;
    }

    const affectedCount = activeItems.filter((item) => normalizeCategoryName(item.category || "") === category).length;
    if (!window.confirm(t("menuManagement.deleteCategoryConfirm", { category, count: affectedCount }))) return;

    setItems((current) => current.map((item) => (
      normalizeCategoryName(item.category || "") === category ? { ...item, deleted: true } : item
    )));
    setCategoryFilter(ALL_CATEGORIES);
    setCategoryTarget("");
    setCategoryDraft("");
    setCategoryNotice(t("menuManagement.categoryDeleted", { category, count: affectedCount }));
  }

  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoError("");
    try {
      const imageUrl = await compressDishPhoto(file);
      setDraft((current) => ({ ...current, imageUrl }));
    } catch (error) {
      setPhotoError(error instanceof ImageError ? t(`imageError.${error.code}`) : t("menuManagement.photoError"));
    }
  }

  function saveItem(event: React.FormEvent): void {
    event.preventDefault();
    const category = normalizeCategoryName(draft.category === CUSTOM_CATEGORY ? draft.customCategory : draft.category);
    if (!category || category === ALL_CATEGORIES) {
      setCategoryError(t("menuManagement.validationCategory"));
      return;
    }
    if (!draft.mealPeriods.length) {
      setPeriodError(t("menuManagement.validationPeriod"));
      return;
    }
    if (!draft.name.trim() || !Number(draft.price)) return;

    if (editingId) {
      setItems((current) => current.map((item) => (
        item.id === editingId
          ? {
              ...item,
              category,
              description: draft.description.trim(),
              imageUrl: draft.imageUrl,
              mealPeriods: draft.mealPeriods,
              name: draft.name.trim(),
              price: Number(draft.price),
            }
          : item
      )));
    } else {
      setItems((current) => [
        ...current,
        {
          category,
          deleted: false,
          description: draft.description.trim(),
          id: `custom-${Date.now()}`,
          imageUrl: draft.imageUrl,
          mealPeriods: draft.mealPeriods,
          name: draft.name.trim(),
          price: Number(draft.price),
          soldOut: false,
        },
      ]);
    }
    resetForm();
  }

  return (
    <section className="management-page">
      <SectionHeader
        action={<button className="management-primary" onClick={createItem} type="button">{t("menuManagement.addDish")}</button>}
        description={t("menuManagement.sectionDescription")}
        title={t("menuManagement.sectionTitle")}
      />
      {showForm && (
        <form className="inline-form" onSubmit={saveItem}>
          <strong className="inline-form-title">{editingId ? t("menuManagement.editDish") : t("menuManagement.addDish")}</strong>
          <div className="dish-photo-field">
            {draft.imageUrl ? (
              <img alt={t("menuManagement.photoPreviewAlt")} className="dish-photo-preview" src={draft.imageUrl} />
            ) : (
              <span className="dish-photo-empty">{t("menuManagement.photo")}</span>
            )}
            <label className="dish-photo-upload">
              {editingId ? t("menuManagement.replacePhoto") : t("menuManagement.uploadPhoto")}
              <input accept="image/*" aria-label={t("menuManagement.uploadDishPhoto")} onChange={selectPhoto} type="file" />
            </label>
          </div>
          <input
            aria-label={t("menuManagement.dishName")}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder={t("menuManagement.dishName")}
            value={draft.name}
          />
          <input
            aria-label={t("menuManagement.price")}
            min="1"
            onChange={(event) => setDraft({ ...draft, price: event.target.value })}
            placeholder={t("menuManagement.price")}
            type="number"
            value={draft.price}
          />
          <textarea
            aria-label={t("menuManagement.description")}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            placeholder={t("menuManagement.descriptionPlaceholder")}
            rows={2}
            value={draft.description}
          />
          <select
            aria-label={t("menuManagement.category")}
            onChange={(event) => {
              setDraft({ ...draft, category: event.target.value });
              setCategoryError("");
            }}
            value={draft.category}
          >
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            <option value={CUSTOM_CATEGORY}>{t("menuManagement.customCategoryOption")}</option>
          </select>
          {draft.category === CUSTOM_CATEGORY && (
            <input
              aria-label={t("menuManagement.customCategory")}
              onChange={(event) => {
                setDraft({ ...draft, customCategory: event.target.value });
                setCategoryError("");
              }}
              placeholder={t("menuManagement.customCategory")}
              value={draft.customCategory}
            />
          )}
          <fieldset className="meal-period-picker">
            <legend>{t("menuManagement.mealPeriods")}</legend>
            {DEFAULT_MEAL_PERIODS.map((period) => (
              <label key={period.id}>
                <input
                  checked={draft.mealPeriods.includes(period.id)}
                  onChange={(event) => {
                    const mealPeriods = event.target.checked
                      ? [...draft.mealPeriods, period.id]
                      : draft.mealPeriods.filter((id) => id !== period.id);
                    setDraft({ ...draft, mealPeriods });
                    setPeriodError("");
                  }}
                  type="checkbox"
                />
                <span>{period.name}</span>
              </label>
            ))}
          </fieldset>
          <button className="management-primary" type="submit">{editingId ? t("menuManagement.saveEdit") : t("menuManagement.saveDish")}</button>
          <button className="management-secondary" onClick={resetForm} type="button">{t("common.cancel")}</button>
          {categoryError && <span className="dish-photo-error">{categoryError}</span>}
          {periodError && <span className="dish-photo-error">{periodError}</span>}
          {photoError && <span className="dish-photo-error">{photoError}</span>}
        </form>
      )}
      <div className="category-manager">
        <div>
          <strong>{t("menuManagement.categoryManagementTitle")}</strong>
          <span>{t("menuManagement.categoryManagementDescription")}</span>
        </div>
        <select
          aria-label={t("menuManagement.chooseCategory")}
          onChange={(event) => selectCategoryForEdit(event.target.value)}
          value={categoryTarget}
        >
          <option value="">{t("menuManagement.chooseCategory")}</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <input
          aria-label={t("menuManagement.categoryNewName")}
          onChange={(event) => setCategoryDraft(event.target.value)}
          placeholder={t("menuManagement.categoryNewName")}
          value={categoryDraft}
        />
        <button className="management-primary" onClick={renameCategory} type="button">{t("menuManagement.saveCategory")}</button>
        <button className="management-danger" onClick={deleteCategory} type="button">{t("menuManagement.deleteCategory")}</button>
        {categoryNotice && <span className="category-manager-notice">{categoryNotice}</span>}
      </div>
      <div className="management-toolbar">
        <input
          aria-label={t("menuManagement.searchPlaceholder")}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("menuManagement.searchPlaceholder")}
          value={query}
        />
        <select
          aria-label={t("menuManagement.filterByCategory")}
          onChange={(event) => setCategoryFilter(event.target.value)}
          value={categoryFilter}
        >
          <option value={ALL_CATEGORIES}>{t("menuManagement.categoryAll")}</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <span>
          {t("menuManagement.totalDishes", { count: visible.length })}
          {categoryFilter !== ALL_CATEGORIES ? ` · ${categoryFilter}` : ""}
        </span>
      </div>
      <div className="management-panel table-panel">
        <table className="management-table">
          <thead>
            <tr>
              <th>{t("menuManagement.table.dish")}</th>
              <th>{t("menuManagement.table.category")}</th>
              <th>{t("menuManagement.table.periods")}</th>
              <th>{t("menuManagement.table.price")}</th>
              <th>{t("menuManagement.table.status")}</th>
              <th>{t("menuManagement.table.soldOut")}</th>
              <th>{t("menuManagement.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="dish-admin-cell">
                    {item.imageUrl ? (
                      <img alt={t("menuManagement.dishPhotoAlt", { name: item.name })} className="dish-admin-photo" src={item.imageUrl} />
                    ) : (
                      <span className="dish-placeholder">{item.name.slice(0, 1)}</span>
                    )}
                    <div>
                      <strong>{item.name}</strong>
                      {item.description && <small>{item.description}</small>}
                    </div>
                  </div>
                </td>
                <td>{item.category}</td>
                <td>{(Array.isArray(item.mealPeriods) ? item.mealPeriods : allMealPeriodIds)
                  .map((id) => DEFAULT_MEAL_PERIODS.find((period) => period.id === id)?.name)
                  .filter(Boolean)
                  .join("、")}</td>
                <td>{money(item.price)}</td>
                <td><span className={`list-status ${item.soldOut ? "inactive" : "active"}`}>{item.soldOut ? t("menuManagement.soldOut") : t("menuManagement.available")}</span></td>
                <td>
                  <Toggle
                    checked={item.soldOut}
                    label={t("menuManagement.toggleSoldOut", { name: item.name })}
                    onChange={() => toggleSoldOut(item.id)}
                  />
                </td>
                <td>
                  <div className="management-row-actions">
                    <button className="management-secondary" onClick={() => editItem(item)} type="button">{t("common.modify")}</button>
                    <button
                      className="management-danger"
                      onClick={() => {
                        if (!window.confirm(t("common.confirmDelete", { name: item.name }))) return;
                        setItems((current) => current.map((entry) => (
                          entry.id === item.id ? { ...entry, deleted: true } : entry
                        )));
                      }}
                      type="button"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
