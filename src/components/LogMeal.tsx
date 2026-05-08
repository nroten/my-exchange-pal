import { useState, useMemo, useCallback, useEffect } from 'react';
import { FOOD_DATABASE, getRecentFoodIds, pushRecentFoodId, getStarredFoodIds, toggleStarredFoodId } from '@/data/foodDatabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  EXCHANGE_CATEGORIES, CATEGORY_META, MEAL_LABELS,
  MealLabel, MealFoodEntry, ExchangeValues, ExchangeCategory,
  EMPTY_EXCHANGES, getDefaultMealLabel, sumExchanges, FoodItem,
} from '@/types/nutrition';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Confetti from '@/components/Confetti';

interface LogMealProps {
  onClose: () => void;
  onSaved: () => void;
  editingMeal?: {
    id: string;
    meal_label: string;
    food_items: MealFoodEntry[];
  };
}

const DRAFT_KEY = 'nutrition_meal_draft';

function loadDraft(): { mealLabel: MealLabel; entries: MealFoodEntry[] } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

type BrowseTab = 'favorites' | ExchangeCategory | 'saved';

export default function LogMeal({ onClose, onSaved, editingMeal }: LogMealProps) {
  const { user } = useAuth();
  const draft = !editingMeal ? loadDraft() : null;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mealLabel, setMealLabel] = useState<MealLabel>(
    (editingMeal?.meal_label as MealLabel) || draft?.mealLabel || getDefaultMealLabel()
  );
  const [entries, setEntries] = useState<MealFoodEntry[]>(
    editingMeal?.food_items || draft?.entries || []
  );
  const [search, setSearch] = useState('');
  const [browseTab, setBrowseTab] = useState<BrowseTab>('favorites');
  const [manualMode, setManualMode] = useState(false);
  const [manualExchanges, setManualExchanges] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [manualName, setManualName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [showSaveAsRecipe, setShowSaveAsRecipe] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>(getRecentFoodIds());
  const [starredIds, setStarredIds] = useState<string[]>(getStarredFoodIds());

  const toggleStar = (food: FoodItem) => {
    const next = toggleStarredFoodId(food.id);
    setStarredIds(next);
    toast.success(next.includes(food.id) ? `⭐ ${food.name} favorited` : `Removed ${food.name} from favorites`);
  };

  // Load saved meals
  useEffect(() => {
    if (!user) return;
    supabase.from('saved_meals').select('*').eq('user_id', user.id).order('updated_at', { ascending: false })
      .then(({ data }) => { if (data) setSavedMeals(data); });
  }, [user]);

  // Save draft on changes
  const saveDraft = useCallback((label: MealLabel, items: MealFoodEntry[]) => {
    if (!editingMeal) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ mealLabel: label, entries: items }));
    }
  }, [editingMeal]);

  const filteredFoods = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(q)).slice(0, 20);
  }, [search]);

  const favoriteFoods = useMemo(() => {
    const starred = starredIds.map(id => FOOD_DATABASE.find(f => f.id === id)).filter(Boolean) as FoodItem[];
    if (starred.length > 0 || recentIds.length > 0) {
      const recents = recentIds
        .filter(id => !starredIds.includes(id))
        .map(id => FOOD_DATABASE.find(f => f.id === id))
        .filter(Boolean) as FoodItem[];
      return [...starred, ...recents];
    }
    // Fallback: a curated set of common foods
    const curated = ['Apple (small)', 'Banana (small)', 'Whole Egg', 'Milk', 'Chicken Breast',
      'Cooked Rice', 'White/Wheat Bread', 'Greek Yogurt', 'Broccoli', 'Avocado', 'Cheese (slice/1oz)', 'Berries'];
    return curated.map(name => FOOD_DATABASE.find(f => f.name === name)).filter(Boolean) as FoodItem[];
  }, [starredIds, recentIds]);

  const foodsByCategory = useMemo(() => {
    const map: Record<ExchangeCategory, FoodItem[]> = {
      starches: [], fruits: [], vegetables: [], proteins: [], dairy: [], fats: [],
    };
    for (const f of FOOD_DATABASE) {
      map[f.primaryCategory].push(f);
    }
    return map;
  }, []);

  const addFood = (food: FoodItem) => {
    // If same food already added, increment quantity by 0.25
    const existingIdx = entries.findIndex(e => e.foodName === food.name);
    let next: MealFoodEntry[];
    if (existingIdx >= 0) {
      next = entries.map((e, i) => i === existingIdx ? { ...e, quantity: e.quantity + 0.25 } : e);
    } else {
      const entry: MealFoodEntry = {
        foodName: food.name,
        serving: food.serving,
        exchanges: food.exchanges,
        quantity: 1,
      };
      next = [...entries, entry];
    }
    setEntries(next);
    saveDraft(mealLabel, next);
    pushRecentFoodId(food.id);
    setRecentIds(getRecentFoodIds());
  };

  const adjustFoodQty = (food: FoodItem, delta: number) => {
    const existingIdx = entries.findIndex(e => e.foodName === food.name);
    if (existingIdx < 0) return;
    const newQty = Math.round((entries[existingIdx].quantity + delta) * 4) / 4;
    let next: MealFoodEntry[];
    if (newQty <= 0) {
      next = entries.filter((_, i) => i !== existingIdx);
    } else {
      next = entries.map((e, i) => i === existingIdx ? { ...e, quantity: newQty } : e);
    }
    setEntries(next);
    saveDraft(mealLabel, next);
  };

  const addManual = () => {
    if (!manualName.trim()) return;
    const hasValues = EXCHANGE_CATEGORIES.some(c => manualExchanges[c] > 0);
    if (!hasValues) { toast.error('Add at least one exchange'); return; }
    const entry: MealFoodEntry = {
      foodName: manualName,
      serving: 'custom',
      exchanges: { ...manualExchanges },
      quantity: 1,
    };
    const next = [...entries, entry];
    setEntries(next);
    saveDraft(mealLabel, next);
    setManualName('');
    setManualExchanges({ ...EMPTY_EXCHANGES });
    setManualMode(false);
  };

  const loadSavedMeal = (saved: any) => {
    const items = (saved.food_items as MealFoodEntry[]) || [];
    // Merge with existing entries: bump quantity for duplicates, append new ones
    const next = [...entries];
    for (const item of items) {
      const idx = next.findIndex(e => e.foodName === item.foodName);
      if (idx >= 0) {
        next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
      } else {
        next.push({ ...item });
      }
    }
    setEntries(next);
    saveDraft(mealLabel, next);
    toast.success(`Added "${saved.name}" 🧡`);
  };

  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    saveDraft(mealLabel, next);
  };

  const updateQuantity = (idx: number, qty: number) => {
    const rounded = Math.round(qty * 4) / 4;
    const next = entries.map((e, i) => i === idx ? { ...e, quantity: Math.max(0.25, rounded) } : e);
    setEntries(next);
    saveDraft(mealLabel, next);
  };

  const totals = sumExchanges(entries);

  const saveAsRecipe = async () => {
    if (!user || !recipeName.trim() || entries.length === 0) return;
    const { error } = await supabase.from('saved_meals').insert({
      user_id: user.id,
      name: recipeName.trim(),
      default_meal_label: mealLabel,
      food_items: entries as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Recipe "${recipeName}" saved! 🧡`);
    setRecipeName('');
    setShowSaveAsRecipe(false);
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (data) setSavedMeals(data);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        meal_label: mealLabel,
        food_items: entries as any,
        total_starches: totals.starches,
        total_fruits: totals.fruits,
        total_vegetables: totals.vegetables,
        total_proteins: totals.proteins,
        total_dairy: totals.dairy,
        total_fats: totals.fats,
      };

      if (editingMeal) {
        const { error } = await supabase.from('meal_logs').update(payload).eq('id', editingMeal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('meal_logs').insert(payload);
        if (error) throw error;
      }

      localStorage.removeItem(DRAFT_KEY);
      setShowConfetti(true);
      toast.success(editingMeal ? 'Meal updated! ✨' : 'Meal logged! Amazing! 🎉');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderFoodTile = (food: FoodItem) => {
    const inMeal = entries.find(e => e.foodName === food.name);
    const isCombo = food.isCombination;
    const isStarred = starredIds.includes(food.id);
    const exchangeCount = Object.values(food.exchanges).filter(v => v && v > 0).length;
    return (
      <div
        key={food.id}
        className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-1 transition-all max-w-[140px] mx-auto w-full ${
          inMeal
            ? 'bg-primary/10 border-primary shadow-md'
            : isCombo
              ? 'bg-gradient-to-br from-secondary/15 to-accent/10 border-dashed border-secondary/60 hover:border-secondary'
              : 'bg-card border-border hover:border-primary/50'
        }`}
      >
        <button
          onClick={() => addFood(food)}
          className="absolute inset-0 rounded-2xl active:scale-95 transition-transform"
          aria-label={`Add ${food.name}`}
        />
        {isCombo && (
          <div
            className="absolute top-1 left-1 bg-secondary text-secondary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none pointer-events-none shadow-sm"
            title={`Counts as ${exchangeCount} exchange types`}
          >
            COMBO
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); toggleStar(food); }}
          className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center text-sm z-10 transition-transform active:scale-90 ${
            isStarred ? 'text-yellow-400 drop-shadow' : 'text-muted-foreground/50 hover:text-yellow-400'
          }`}
          aria-label={isStarred ? `Unfavorite ${food.name}` : `Favorite ${food.name}`}
          title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isStarred ? '★' : '☆'}
        </button>
        <div className="text-3xl mb-0.5 pointer-events-none">{food.emoji}</div>
        <div className="text-[10px] font-semibold text-center leading-tight line-clamp-2 px-0.5 pointer-events-none">
          {food.name.replace(/\s*\(.*?\)/, '')}
        </div>
        {inMeal && (
          <>
            {/* Quantity badge */}
            <div className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center text-xs font-bold shadow-md pointer-events-none">
              {inMeal.quantity}
            </div>
            {/* Inline −/+ stepper at bottom */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-card border-2 border-primary rounded-full shadow-md z-10">
              <button
                onClick={(e) => { e.stopPropagation(); adjustFoodQty(food, -0.25); }}
                className="w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center hover:bg-muted active:scale-90 transition-transform"
                aria-label="Decrease"
              >−</button>
              <button
                onClick={(e) => { e.stopPropagation(); adjustFoodQty(food, 0.25); }}
                className="w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center hover:bg-muted active:scale-90 transition-transform"
                aria-label="Increase"
              >+</button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background z-40 flex flex-col overflow-hidden">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <button onClick={onClose} className="text-muted-foreground font-medium">Cancel</button>
        <h2 className="font-bold">
          {editingMeal ? 'Edit Meal' : 'Log a Meal'} {step === 1 ? '🍽️' : step === 2 ? '🥗' : '✅'}
        </h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Step 1: Pick meal label */}
        {step === 1 && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">What meal is this?</p>
            <div className="grid grid-cols-2 gap-3">
              {MEAL_LABELS.map(label => (
                <button
                  key={label}
                  onClick={() => { setMealLabel(label); saveDraft(label, entries); setStep(2); }}
                  className={`p-4 rounded-2xl border text-sm font-semibold transition-all ${
                    mealLabel === label
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-card hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Add foods */}
        {step === 2 && (
          <div className="flex flex-col">
            {/* Search bar */}
            <div className="p-4 pb-2 sticky top-0 bg-background z-10 border-b">
              <Input
                placeholder="🔍 Search foods..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Search results */}
            {search.trim() && (
              <div className="p-4 pt-2">
                {filteredFoods.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                    {filteredFoods.map(renderFoodTile)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No matches. Try the manual entry below.</p>
                )}
              </div>
            )}

            {/* Browse tabs (when not searching) */}
            {!search.trim() && !manualMode && (
              <>
                <div className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto sticky top-[68px] bg-background z-10 border-b">
                  <button
                    onClick={() => setBrowseTab('favorites')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                      browseTab === 'favorites' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    ⭐ Favorites
                  </button>
                  <button
                    onClick={() => setBrowseTab('saved')}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                      browseTab === 'saved' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    🧡 My Recipes
                  </button>
                  {EXCHANGE_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBrowseTab(cat)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                        browseTab === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {browseTab === 'favorites' && (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        {recentIds.length > 0 ? 'Your most-used foods. Tap to add.' : 'Common foods to get you started. Tap to add.'}
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {favoriteFoods.map(renderFoodTile)}
                      </div>
                    </>
                  )}

                  {browseTab === 'saved' && (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">Your saved meals. Tap to load all foods at once.</p>
                      {savedMeals.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                          <div className="text-4xl mb-2">🧡</div>
                          <p>No saved meals yet.</p>
                          <p className="text-xs mt-1">After adding foods, tap "Save as recipe" below.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {savedMeals.map(sm => {
                            const items = (sm.food_items as MealFoodEntry[]) || [];
                            const emojis = items.slice(0, 4).map(it => {
                              const fd = FOOD_DATABASE.find(f => f.name === it.foodName);
                              return fd?.emoji || '🍽️';
                            });
                            return (
                              <button
                                key={sm.id}
                                onClick={() => loadSavedMeal(sm)}
                                className="w-full bg-card border rounded-2xl p-3 flex items-center gap-3 hover:border-primary transition-colors text-left"
                              >
                                <div className="text-2xl">{emojis.join(' ')}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-sm">{sm.name}</div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {items.length} item{items.length !== 1 ? 's' : ''}
                                    {sm.default_meal_label && ` · ${sm.default_meal_label}`}
                                  </div>
                                </div>
                                <div className="text-primary text-lg">+</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {EXCHANGE_CATEGORIES.includes(browseTab as ExchangeCategory) && (
                    <>
                      <p className="text-xs text-muted-foreground mb-3">
                        Tap to add. Use −/+ to adjust by ¼ servings (e.g. ½ avocado, ¼ cup rice).
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3">
                        {foodsByCategory[browseTab as ExchangeCategory].map(renderFoodTile)}
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => setManualMode(true)}
                    className="text-xs text-primary font-medium underline mt-4 block"
                  >
                    Or enter exchanges manually →
                  </button>
                </div>
              </>
            )}

            {/* Manual mode */}
            {!search.trim() && manualMode && (
              <div className="p-4 space-y-3">
                <Input
                  placeholder="Food name (optional)"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="rounded-xl"
                />
                {EXCHANGE_CATEGORIES.map(cat => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-sm">{CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={manualExchanges[cat] || ''}
                      onChange={(e) => setManualExchanges(prev => ({
                        ...prev,
                        [cat]: parseFloat(e.target.value) || 0,
                      }))}
                      className="w-20 rounded-xl text-center"
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button onClick={addManual} className="flex-1 rounded-xl">Add</Button>
                  <Button variant="outline" onClick={() => setManualMode(false)} className="rounded-xl">
                    Back
                  </Button>
                </div>
              </div>
            )}

            {/* Current entries — sticky bottom summary */}
            {entries.length > 0 && (
              <div className="px-4 pb-4">
                <div className="bg-muted/50 rounded-2xl p-3 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">In this meal ({entries.length})</h3>
                    {!editingMeal && (
                      <button
                        onClick={() => setShowSaveAsRecipe(!showSaveAsRecipe)}
                        className="text-xs text-primary font-semibold"
                      >
                        🧡 Save as recipe
                      </button>
                    )}
                  </div>

                  {showSaveAsRecipe && (
                    <div className="bg-card border rounded-xl p-2 mb-2 flex gap-2">
                      <Input
                        placeholder="Recipe name (e.g. My usual breakfast)"
                        value={recipeName}
                        onChange={(e) => setRecipeName(e.target.value)}
                        className="rounded-lg text-sm flex-1"
                      />
                      <Button onClick={saveAsRecipe} disabled={!recipeName.trim()} size="sm" className="rounded-lg">
                        Save
                      </Button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {entries.map((entry, idx) => {
                      const fd = FOOD_DATABASE.find(f => f.name === entry.foodName);
                      return (
                        <div key={idx} className="bg-card border rounded-xl p-2 flex items-center gap-2">
                          <div className="text-xl shrink-0">{fd?.emoji || '🍽️'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{entry.foodName}</div>
                            <div className="text-xs text-muted-foreground truncate">{entry.serving}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => updateQuantity(idx, entry.quantity - 0.25)}
                              className="w-6 h-6 rounded-full bg-muted text-sm font-bold flex items-center justify-center"
                            >−</button>
                            <span className="text-sm font-bold w-6 text-center">{entry.quantity}</span>
                            <button
                              onClick={() => updateQuantity(idx, entry.quantity + 0.25)}
                              className="w-6 h-6 rounded-full bg-muted text-sm font-bold flex items-center justify-center"
                            >+</button>
                            <button
                              onClick={() => removeEntry(idx)}
                              className="text-destructive text-xs ml-1 w-6 h-6"
                            >✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-4">Here's your {mealLabel.toLowerCase()} summary</p>
            <div className="bg-card border rounded-2xl p-4 mb-4">
              <h3 className="font-bold mb-3">This meal adds:</h3>
              <div className="grid grid-cols-3 gap-3">
                {EXCHANGE_CATEGORIES.map(cat => (
                  totals[cat] > 0 && (
                    <div key={cat} className="text-center">
                      <div className="text-2xl">{CATEGORY_META[cat].emoji}</div>
                      <div className="font-bold">{totals[cat]}</div>
                      <div className="text-xs text-muted-foreground">{CATEGORY_META[cat].label}</div>
                    </div>
                  )
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {entries.map((entry, idx) => {
                const fd = FOOD_DATABASE.find(f => f.name === entry.foodName);
                return (
                  <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="text-base">{fd?.emoji || '🍽️'}</span>
                    <span>{entry.quantity > 1 ? `${entry.quantity}× ` : ''}{entry.foodName} ({entry.serving})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="p-4 border-t flex gap-3">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep((step - 1) as 1 | 2)} className="rounded-xl">
            Back
          </Button>
        )}
        {step === 2 && entries.length > 0 && (
          <Button onClick={() => setStep(3)} className="flex-1 rounded-xl">
            Review Meal →
          </Button>
        )}
        {step === 3 && (
          <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl">
            {saving ? 'Saving...' : editingMeal ? 'Save Changes ✨' : 'Log This Meal! 🎉'}
          </Button>
        )}
      </div>
    </div>
  );
}
