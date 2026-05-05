export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodKind = 'base' | 'variation' | 'addon';

export const MEAL_SLOTS: { key: MealSlot; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '🥗' },
  { key: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { key: 'snack', label: 'Snack', emoji: '🍿' },
];

export interface MacroFood {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  meal_slot: MealSlot;
  kind: FoodKind;
  parent_id: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  sort_order: number;
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface MacroLog {
  id: string;
  user_id: string;
  log_date: string;
  meal_slot: MealSlot;
  food_id: string | null;
  food_name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  quantity: number;
  created_at: string;
}

export const EMPTY_MACROS: MacroTargets = { calories: 0, protein: 0, carbs: 0, fats: 0 };

export function sumMacros(logs: Pick<MacroLog, 'calories' | 'protein' | 'carbs' | 'fats' | 'quantity'>[]): MacroTargets {
  return logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories * l.quantity,
      protein: acc.protein + l.protein * l.quantity,
      carbs: acc.carbs + l.carbs * l.quantity,
      fats: acc.fats + l.fats * l.quantity,
    }),
    { ...EMPTY_MACROS },
  );
}

export function getCurrentMealSlot(): MealSlot {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 17) return 'snack';
  if (h < 21) return 'dinner';
  return 'snack';
}
