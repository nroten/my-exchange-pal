import { FoodItem, ExchangeCategory } from '@/types/nutrition';

let _id = 0;
const f = (
  name: string,
  serving: string,
  exchanges: FoodItem['exchanges'],
  emoji: string,
  primaryCategory: ExchangeCategory,
  isCombination = false,
): FoodItem => ({
  id: String(++_id),
  name,
  serving,
  exchanges,
  emoji,
  primaryCategory,
  isCombination,
});

export const FOOD_DATABASE: FoodItem[] = [
  // STARCHES
  f('White/Wheat Bread', '1 slice', { starches: 1 }, '🍞', 'starches'),
  f('Bagel (mini)', '1 mini bagel', { starches: 1 }, '🥯', 'starches'),
  f('Bagel (standard)', '½ bagel', { starches: 1 }, '🥯', 'starches'),
  f('English Muffin', '½ muffin', { starches: 1 }, '🫓', 'starches'),
  f('Tortilla (6-inch)', '1 tortilla', { starches: 1 }, '🌮', 'starches'),
  f('Pita (6-inch)', '½ pita', { starches: 1 }, '🫓', 'starches'),
  f('Plain Roll', '1 roll', { starches: 1 }, '🍞', 'starches'),
  f('Pancake (4-inch)', '1 pancake', { starches: 1 }, '🥞', 'starches'),
  f('Waffle (Eggo-size)', '1 waffle', { starches: 1 }, '🧇', 'starches'),
  f('Cooked Oatmeal', '½ cup', { starches: 1 }, '🥣', 'starches'),
  f('Granola', '¼ cup', { starches: 1 }, '🥣', 'starches'),
  f('Cooked Pasta', '½ cup', { starches: 1 }, '🍝', 'starches'),
  f('Cooked Rice', '½ cup', { starches: 1 }, '🍚', 'starches'),
  f('Cooked Quinoa', '½ cup', { starches: 1 }, '🍚', 'starches'),
  f('Cooked Lentils', '½ cup', { starches: 1, proteins: 1 }, '🫘', 'starches', true),
  f('Cooked Beans', '½ cup', { starches: 1, proteins: 1 }, '🫘', 'starches', true),
  f('Small Baked Potato', '1 small', { starches: 1 }, '🥔', 'starches'),
  f('Mashed Potato', '½ cup', { starches: 1 }, '🥔', 'starches'),
  f('Corn', '½ cup', { starches: 1 }, '🌽', 'starches'),
  f('Peas', '½ cup', { starches: 1 }, '🟢', 'starches'),
  f('Graham Crackers', '1.5 sheets', { starches: 1 }, '🍪', 'starches'),
  f('Popcorn', '3 cups', { starches: 1 }, '🍿', 'starches'),
  f('Pretzels', '½ cup', { starches: 1 }, '🥨', 'starches'),
  f('Animal Crackers', '10 crackers', { starches: 1 }, '🍪', 'starches'),

  // FRUITS
  f('Apple (small)', '1 small', { fruits: 1 }, '🍎', 'fruits'),
  f('Banana (small)', '1 small', { fruits: 1 }, '🍌', 'fruits'),
  f('Orange (medium)', '1 medium', { fruits: 1 }, '🍊', 'fruits'),
  f('Grapes', '1 cup', { fruits: 1 }, '🍇', 'fruits'),
  f('Berries', '1 cup', { fruits: 1 }, '🫐', 'fruits'),
  f('Clementines', '2 medium', { fruits: 1 }, '🍊', 'fruits'),
  f('Raisins', '¼ cup', { fruits: 1 }, '🍇', 'fruits'),
  f('Applesauce (unsweetened)', '1 cup', { fruits: 1 }, '🍎', 'fruits'),
  f('Orange Juice', '½ cup', { fruits: 1 }, '🧃', 'fruits'),
  f('Apple Juice', '½ cup', { fruits: 1 }, '🧃', 'fruits'),
  f('Peach (medium)', '1 medium', { fruits: 1 }, '🍑', 'fruits'),
  f('Pear (medium)', '1 medium', { fruits: 1 }, '🍐', 'fruits'),
  f('Kiwi', '2 pieces', { fruits: 1 }, '🥝', 'fruits'),
  f('Watermelon', '1 cup', { fruits: 1 }, '🍉', 'fruits'),
  f('Dried Apricots', '8 halves', { fruits: 1 }, '🍑', 'fruits'),
  f('Strawberries', '1¼ cup', { fruits: 1 }, '🍓', 'fruits'),
  f('Pineapple', '¾ cup', { fruits: 1 }, '🍍', 'fruits'),
  f('Mango', '½ cup', { fruits: 1 }, '🥭', 'fruits'),
  f('Cherries', '12 pieces', { fruits: 1 }, '🍒', 'fruits'),

  // VEGETABLES
  f('Broccoli', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥦', 'vegetables'),
  f('Carrots', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥕', 'vegetables'),
  f('Spinach', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥬', 'vegetables'),
  f('Cauliflower', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥦', 'vegetables'),
  f('Cucumber', '1 cup raw', { vegetables: 1 }, '🥒', 'vegetables'),
  f('Zucchini', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥒', 'vegetables'),
  f('Bell Peppers', '1 cup raw', { vegetables: 1 }, '🫑', 'vegetables'),
  f('Tomato', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🍅', 'vegetables'),
  f('Mushrooms', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🍄', 'vegetables'),
  f('Green Beans', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🫛', 'vegetables'),
  f('Kale', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥬', 'vegetables'),
  f('Asparagus', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥬', 'vegetables'),
  f('Celery', '1 cup raw', { vegetables: 1 }, '🥬', 'vegetables'),
  f('Lettuce', '1 cup raw', { vegetables: 1 }, '🥗', 'vegetables'),
  f('Edamame', '½ cup', { vegetables: 1 }, '🫛', 'vegetables'),
  f('Cabbage', '1 cup raw / ½ cup cooked', { vegetables: 1 }, '🥬', 'vegetables'),
  f('Onion', '½ cup cooked', { vegetables: 1 }, '🧅', 'vegetables'),
  f('Beets', '½ cup cooked', { vegetables: 1 }, '🥕', 'vegetables'),
  f('Eggplant', '½ cup cooked', { vegetables: 1 }, '🍆', 'vegetables'),
  f('Tomato/Vegetable Juice', '½ cup', { vegetables: 1 }, '🥤', 'vegetables'),

  // PROTEINS
  f('Chicken Breast', '1 oz', { proteins: 1 }, '🍗', 'proteins'),
  f('Beef', '1 oz', { proteins: 1 }, '🥩', 'proteins'),
  f('Pork', '1 oz', { proteins: 1 }, '🥓', 'proteins'),
  f('Fish Fillet', '1 oz', { proteins: 1 }, '🐟', 'proteins'),
  f('Turkey', '1 oz', { proteins: 1 }, '🦃', 'proteins'),
  f('Ham', '1 oz', { proteins: 1 }, '🥓', 'proteins'),
  f('Tuna', '1 oz', { proteins: 1 }, '🐟', 'proteins'),
  f('Salmon', '1 oz', { proteins: 1 }, '🐟', 'proteins'),
  f('Shrimp', '3 large', { proteins: 1 }, '🦐', 'proteins'),
  f('Whole Egg', '1 egg', { proteins: 1 }, '🥚', 'proteins'),
  f('Egg Whites', '2 whites', { proteins: 1 }, '🥚', 'proteins'),
  f('Cottage Cheese (protein)', '¼ cup', { proteins: 1 }, '🧀', 'proteins'),
  f('Greek Yogurt', '4 oz / ½ cup', { proteins: 1, dairy: 1 }, '🥛', 'proteins', true),
  f('Peanut Butter', '2 tbsp', { proteins: 1, fats: 2 }, '🥜', 'proteins', true),
  f('Almond Butter', '2 tbsp', { proteins: 1, fats: 2 }, '🥜', 'proteins', true),
  f('Nuts (¼ cup)', '¼ cup', { proteins: 1, fats: 2 }, '🥜', 'proteins', true),
  f('Hummus', '⅓ cup', { proteins: 1, fats: 1 }, '🫛', 'proteins', true),
  f('Tofu', '¼ cup cooked', { proteins: 1 }, '🍢', 'proteins'),
  f('Tempeh', '¼ cup', { proteins: 1 }, '🍢', 'proteins'),

  // DAIRY
  f('Milk', '1 cup', { dairy: 1 }, '🥛', 'dairy'),
  f('Soy Milk', '1 cup', { dairy: 1 }, '🥛', 'dairy'),
  f('Regular Yogurt', '6 oz', { dairy: 1 }, '🥣', 'dairy'),
  f('Cheese (slice/1oz)', '1 slice / 1 oz', { dairy: 1 }, '🧀', 'dairy'),
  f('Shredded Cheese', '¼ cup', { dairy: 1 }, '🧀', 'dairy'),
  f('Cottage Cheese (dairy)', '½ cup / 4 oz', { dairy: 1 }, '🧀', 'dairy'),
  f('Kefir', '1 cup', { dairy: 1 }, '🥛', 'dairy'),
  f('Almond Milk', '2 cups', { dairy: 1 }, '🥛', 'dairy'),

  // FATS
  f('Olive Oil', '1 tsp', { fats: 1 }, '🫒', 'fats'),
  f('Butter', '1 tsp', { fats: 1 }, '🧈', 'fats'),
  f('Avocado', '¼ small', { fats: 1 }, '🥑', 'fats'),
  f('Guacamole', '2 tbsp', { fats: 1 }, '🥑', 'fats'),
  f('Peanut Butter (fat)', '1 tbsp', { fats: 2 }, '🥜', 'fats'),
  f('Mayo', '1 tbsp', { fats: 1 }, '🥚', 'fats'),
  f('Salad Dressing', '1 tbsp', { fats: 1 }, '🥗', 'fats'),
  f('Walnuts', '4 halves', { fats: 1 }, '🥜', 'fats'),
  f('Pesto', '1 tbsp', { fats: 1 }, '🌿', 'fats'),
  f('Cream Cheese', '1 tbsp', { fats: 1 }, '🧀', 'fats'),
  f('Sour Cream', '2 tbsp', { fats: 1 }, '🥄', 'fats'),
  f('Coconut Milk', '2 tbsp', { fats: 1 }, '🥥', 'fats'),
  f('Seeds', '1 tbsp', { fats: 1 }, '🌻', 'fats'),

  // COMBINATION FOODS
  f('Biscuit', '1 biscuit', { starches: 1, fats: 1 }, '🥐', 'starches', true),
  f('French Toast', '1 slice', { starches: 1, fats: 1 }, '🍞', 'starches', true),
  f('Pancake (7-inch)', '1 large', { starches: 2 }, '🥞', 'starches'),
  f('Belgian Waffle (half)', '½ waffle', { starches: 1, fats: 1 }, '🧇', 'starches', true),
  f('Hash Browns', '½ cup', { starches: 1, fats: 1 }, '🥔', 'starches', true),
  f('Tater Tots', '6 large', { starches: 1, fats: 1 }, '🥔', 'starches', true),
  f('Granola Bar', '1 bar', { starches: 1 }, '🍫', 'starches'),
  f('Cheez-Its', '½ cup', { starches: 1, fats: 1 }, '🧀', 'starches', true),
  f('Potato Chips', '12 chips', { starches: 1, fats: 1 }, '🍟', 'starches', true),
  f('Tortilla Chips', '12 chips', { starches: 1, fats: 1 }, '🌮', 'starches', true),
  f('Hot Dog', '1 hot dog', { proteins: 1, fats: 2 }, '🌭', 'proteins', true),
  f('Bratwurst', '1 bratwurst', { proteins: 3, fats: 2 }, '🌭', 'proteins', true),
  f('Mac & Cheese', '1 cup', { starches: 2, proteins: 2, fats: 2 }, '🧀', 'starches', true),
  f('Pizza (thin crust)', '3-4 slices', { starches: 3, proteins: 2, fats: 3 }, '🍕', 'starches', true),
  f('Chili with Meat & Beans', '1 cup', { starches: 1.5, proteins: 2, fats: 1 }, '🌶️', 'proteins', true),
  f('Burrito', '1 burrito', { starches: 2, proteins: 2, fats: 2 }, '🌯', 'starches', true),
  f('French Fries (small)', '1 small order', { starches: 2, fats: 2 }, '🍟', 'starches', true),
  f('Hamburger', '1 burger', { starches: 2, proteins: 3, fats: 2 }, '🍔', 'proteins', true),
  f('Sandwich (turkey)', '1 sandwich', { starches: 2, proteins: 2, fats: 1 }, '🥪', 'starches', true),
  f('Sushi Roll', '6 pieces', { starches: 2, proteins: 1 }, '🍣', 'starches', true),
  f('Taco', '1 taco', { starches: 1, proteins: 1, fats: 1 }, '🌮', 'starches', true),
  f('Ice Cream', '½ cup', { starches: 1, fats: 2 }, '🍦', 'starches', true),
  f('Cookie (medium)', '1 cookie', { starches: 1, fats: 1 }, '🍪', 'starches', true),
  f('Donut', '1 donut', { starches: 2, fats: 2 }, '🍩', 'starches', true),
];

export const FAVORITE_FOOD_NAMES_KEY = 'nutrition_recent_foods';

export function getRecentFoodIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_FOOD_NAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function pushRecentFoodId(id: string) {
  const list = getRecentFoodIds().filter((x) => x !== id);
  list.unshift(id);
  localStorage.setItem(FAVORITE_FOOD_NAMES_KEY, JSON.stringify(list.slice(0, 12)));
}

export const STARRED_FOOD_KEY = 'nutrition_starred_foods';

export function getStarredFoodIds(): string[] {
  try {
    const raw = localStorage.getItem(STARRED_FOOD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleStarredFoodId(id: string): string[] {
  const list = getStarredFoodIds();
  const next = list.includes(id) ? list.filter(x => x !== id) : [id, ...list];
  localStorage.setItem(STARRED_FOOD_KEY, JSON.stringify(next));
  return next;
}
