export type ExchangeCategory = 'starches' | 'fruits' | 'vegetables' | 'proteins' | 'dairy' | 'fats';

export const EXCHANGE_CATEGORIES: ExchangeCategory[] = ['starches', 'fruits', 'vegetables', 'proteins', 'dairy', 'fats'];

export const CATEGORY_META: Record<ExchangeCategory, { label: string; color: string; emoji: string }> = {
  starches:   { label: 'Starches',   color: 'exchange-starches',   emoji: '🍞' },
  fruits:     { label: 'Fruits',     color: 'exchange-fruits',     emoji: '🍎' },
  vegetables: { label: 'Veggies',    color: 'exchange-vegetables', emoji: '🥦' },
  proteins:   { label: 'Proteins',   color: 'exchange-proteins',   emoji: '🍗' },
  dairy:      { label: 'Dairy',      color: 'exchange-dairy',      emoji: '🥛' },
  fats:       { label: 'Fats',       color: 'exchange-fats',       emoji: '🥑' },
};

export const MEAL_LABELS = [
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Afternoon Snack',
  'Dinner',
  'Evening Snack',
] as const;

export type MealLabel = typeof MEAL_LABELS[number];

export type ExchangeValues = Record<ExchangeCategory, number>;

export const EMPTY_EXCHANGES: ExchangeValues = {
  starches: 0, fruits: 0, vegetables: 0, proteins: 0, dairy: 0, fats: 0,
};

export interface FoodItem {
  id: string;
  name: string;
  serving: string;
  exchanges: Partial<ExchangeValues>;
  isCombination: boolean;
}

export interface MealFoodEntry {
  foodName: string;
  serving: string;
  exchanges: Partial<ExchangeValues>;
  quantity: number;
}

export interface DailyTargets extends ExchangeValues {}

export function getDefaultMealLabel(): MealLabel {
  const hour = new Date().getHours();
  if (hour < 10) return 'Breakfast';
  if (hour < 11) return 'Morning Snack';
  if (hour < 14) return 'Lunch';
  if (hour < 16) return 'Afternoon Snack';
  if (hour < 19) return 'Dinner';
  return 'Evening Snack';
}

export function sumExchanges(entries: MealFoodEntry[]): ExchangeValues {
  const totals = { ...EMPTY_EXCHANGES };
  for (const entry of entries) {
    for (const cat of EXCHANGE_CATEGORIES) {
      totals[cat] += (entry.exchanges[cat] || 0) * entry.quantity;
    }
  }
  return totals;
}
