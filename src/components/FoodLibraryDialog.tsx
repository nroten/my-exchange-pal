import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import foodDb from '@/data/foodMacroDatabase.json';
import { MealSlot, MEAL_SLOTS } from '@/types/macros';

export interface LibraryFood {
  name: string;
  category: string;
  meal: string[];
  emoji: string;
  serving: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  exchangeType: string;
  exchangeAmt: string;
  exchangeNote: string;
}

const SLOT_TO_MEAL: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSlot: MealSlot;
  onAdd: (food: LibraryFood, slot: MealSlot) => Promise<void> | void;
  existingNames: Set<string>;
}

export default function FoodLibraryDialog({ open, onOpenChange, initialSlot, onAdd, existingNames }: Props) {
  const [slot, setSlot] = useState<MealSlot>(initialSlot);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  // Sync internal slot when dialog opens or the parent's active slot changes
  useEffect(() => {
    if (open) setSlot(initialSlot);
  }, [open, initialSlot]);

  const allFoods = (foodDb as { foods: LibraryFood[] }).foods;

  const filtered = useMemo(() => {
    const mealLabel = SLOT_TO_MEAL[slot];
    const q = query.trim().toLowerCase();
    return allFoods
      .filter(f => !q || f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q) || f.exchangeType.toLowerCase().includes(q))
      .sort((a, b) => {
        // Foods typical for this meal float to the top
        const aTypical = a.meal.includes(mealLabel) ? 0 : 1;
        const bTypical = b.meal.includes(mealLabel) ? 0 : 1;
        if (aTypical !== bTypical) return aTypical - bTypical;
        return a.name.localeCompare(b.name);
      });
  }, [allFoods, slot, query]);

  async function handleAdd(f: LibraryFood) {
    setAdding(f.name);
    try { await onAdd(f, slot); } finally { setAdding(null); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col bg-macro-surface border-macro-border text-macro-text">
        <DialogHeader>
          <DialogTitle className="text-macro-text">📚 Food Library</DialogTitle>
          <p className="text-xs text-macro-muted">Tap to add a tile to your {SLOT_TO_MEAL[slot].toLowerCase()} board.</p>
        </DialogHeader>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {MEAL_SLOTS.map(s => (
            <button
              key={s.key}
              onClick={() => setSlot(s.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition ${
                slot === s.key
                  ? 'bg-macro-primary text-macro-primary-foreground border-macro-primary'
                  : 'bg-macro-bg border-macro-border text-macro-muted'
              }`}
            >
              {s.emoji} {s.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-macro-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods, category, or exchange type..."
            className="pl-9 rounded-xl bg-macro-bg border-macro-border text-macro-text placeholder:text-macro-muted"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-macro-muted">No matches. Try another search.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map(f => {
                const already = existingNames.has(f.name.toLowerCase());
                return (
                  <div
                    key={f.name}
                    className="bg-macro-bg border border-macro-border rounded-xl p-3 flex gap-3 items-start"
                  >
                    <span className="text-2xl shrink-0">{f.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-macro-text leading-tight">{f.name}</div>
                      <div className="text-[10px] text-macro-muted mt-0.5">{f.serving}</div>
                      <div className="text-[10px] mt-1">
                        <span className="text-macro-calories font-semibold">{f.calories} kcal</span>
                        {' · '}<span className="text-macro-protein">P{f.protein}</span>
                        {' · '}<span className="text-macro-carbs">C{f.carbs}</span>
                        {' · '}<span className="text-macro-fats">F{f.fat}</span>
                      </div>
                      <div className="text-[10px] text-macro-muted mt-1 italic">
                        {f.exchangeAmt} {f.exchangeType.toLowerCase()}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={already || adding === f.name}
                      onClick={() => handleAdd(f)}
                      className="rounded-full bg-macro-primary text-macro-primary-foreground h-8 w-8 p-0 shrink-0"
                      aria-label={already ? 'Already in your tiles' : 'Add tile'}
                      title={already ? 'Already in your tiles' : 'Add tile'}
                    >
                      {already ? '✓' : <Plus size={14} />}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
