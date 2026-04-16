import { useState, useMemo, useCallback } from 'react';
import { FOOD_DATABASE } from '@/data/foodDatabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  EXCHANGE_CATEGORIES, CATEGORY_META, MEAL_LABELS,
  MealLabel, MealFoodEntry, ExchangeValues, ExchangeCategory,
  EMPTY_EXCHANGES, getDefaultMealLabel, sumExchanges,
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
  const [manualMode, setManualMode] = useState(false);
  const [manualExchanges, setManualExchanges] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [manualName, setManualName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Save draft on changes
  const saveDraft = useCallback((label: MealLabel, items: MealFoodEntry[]) => {
    if (!editingMeal) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ mealLabel: label, entries: items }));
    }
  }, [editingMeal]);

  const filteredFoods = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return FOOD_DATABASE.filter(f => f.name.toLowerCase().includes(q)).slice(0, 15);
  }, [search]);

  const addFood = (food: typeof FOOD_DATABASE[0]) => {
    const entry: MealFoodEntry = {
      foodName: food.name,
      serving: food.serving,
      exchanges: food.exchanges,
      quantity: 1,
    };
    const next = [...entries, entry];
    setEntries(next);
    saveDraft(mealLabel, next);
    setSearch('');
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

  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    saveDraft(mealLabel, next);
  };

  const updateQuantity = (idx: number, qty: number) => {
    const next = entries.map((e, i) => i === idx ? { ...e, quantity: Math.max(0.5, qty) } : e);
    setEntries(next);
    saveDraft(mealLabel, next);
  };

  const totals = sumExchanges(entries);

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

      <div className="flex-1 overflow-y-auto p-4">
        {/* Step 1: Pick meal label */}
        {step === 1 && (
          <div>
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
          <div>
            <p className="text-sm text-muted-foreground mb-3">Add foods to your {mealLabel.toLowerCase()}</p>

            {!manualMode ? (
              <>
                <Input
                  placeholder="Search for a food..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-xl mb-2"
                  autoFocus
                />
                {filteredFoods.length > 0 && (
                  <div className="bg-card border rounded-xl mb-4 max-h-52 overflow-y-auto">
                    {filteredFoods.map(food => (
                      <button
                        key={food.id}
                        onClick={() => addFood(food)}
                        className="w-full text-left p-3 border-b last:border-b-0 hover:bg-muted transition-colors"
                      >
                        <div className="font-medium text-sm">{food.name}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                          <span>{food.serving}</span>
                          <span>·</span>
                          <span>
                            {Object.entries(food.exchanges).map(([k, v]) =>
                              `${v} ${CATEGORY_META[k as ExchangeCategory].label.toLowerCase()}`
                            ).join(' + ')}
                          </span>
                          {food.isCombination && (
                            <span className="text-primary font-medium">combo</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setManualMode(true)}
                  className="text-sm text-primary font-medium underline"
                >
                  Or enter exchanges manually
                </button>
              </>
            ) : (
              <div className="space-y-3">
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
                    Back to search
                  </Button>
                </div>
              </div>
            )}

            {/* Current entries */}
            {entries.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-sm mb-2">Added foods</h3>
                <div className="space-y-2">
                  {entries.map((entry, idx) => (
                    <div key={idx} className="bg-card border rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium">{entry.foodName}</div>
                        <div className="text-xs text-muted-foreground">{entry.serving}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(idx, entry.quantity - 0.5)}
                          className="w-7 h-7 rounded-full bg-muted text-sm font-bold flex items-center justify-center"
                        >−</button>
                        <span className="text-sm font-bold w-6 text-center">{entry.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idx, entry.quantity + 0.5)}
                          className="w-7 h-7 rounded-full bg-muted text-sm font-bold flex items-center justify-center"
                        >+</button>
                        <button
                          onClick={() => removeEntry(idx)}
                          className="text-destructive text-xs ml-2"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Summary */}
        {step === 3 && (
          <div>
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
              {entries.map((entry, idx) => (
                <div key={idx} className="text-sm text-muted-foreground">
                  {entry.quantity > 1 ? `${entry.quantity}× ` : ''}{entry.foodName} ({entry.serving})
                </div>
              ))}
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
