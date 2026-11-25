import type { Category } from "./types";

export const CATEGORIES: Category[] = ["souvenir", "coffee", "dessert", "tea"];

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  souvenir: { label: "伴手禮", icon: "🎁", color: "#ea4335" },
  coffee: { label: "咖啡", icon: "☕", color: "#795548" },
  dessert: { label: "甜點", icon: "🍰", color: "#e91e63" },
  tea: { label: "茶館", icon: "🍵", color: "#2e7d32" },
};
