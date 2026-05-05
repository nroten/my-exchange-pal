import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MacroFood, MacroLog, MacroTargets, MealSlot, MEAL_SLOTS,
  EMPTY_MACROS, sumMacros, getCurrentMealSlot,
} from '@/types/macros';
import { Plus, Minus, X, Pencil } from 'lucide-react';

const SLOT_ACCENT: Record<MealSlot, string> = {
  breakfast: 'from-macro-fats/20 to-macro-calories/10 border-macro-fats/30',
  lunch: 'from-macro-carbs/20 to-macro-primary/10 border-macro-carbs/30',
  dinner: 'from-macro-protein/20 to-macro-primary/10 border-macro-protein/30',
  snack: 'from-macro-primary/20 to-macro-carbs/10 border-macro-primary/30',
};

interface FoodFormState {
  id?: string;
  name: string;
  emoji: string;
  meal_slot: MealSlot;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

const EMPTY_FORM: FoodFormState = {
  name: '', emoji: '🍽️', meal_slot: 'breakfast',
  calories: '', protein: '', carbs: '', fats: '',
};

export default function MacrosTracker() {
  const { user, profile } = useAuth();
  const [targets, setTargets] = useState<MacroTargets>({ calories: 2000, protein: 100, carbs: 220, fats: 70 });
  const [foods, setFoods] = useState<MacroFood[]>([]);
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [activeSlot, setActiveSlot] = useState<MealSlot>(getCurrentMealSlot());
  const [showFoodDialog, setShowFoodDialog] = useState(false);
  const [form, setForm] = useState<FoodFormState>(EMPTY_FORM);

  const today = new Date().toISOString().split('T')[0];

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [t, f, l] = await Promise.all([
      supabase.from('macro_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('macro_foods').select('*').eq('user_id', user.id).order('sort_order').order('created_at'),
      supabase.from('macro_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('created_at'),
    ]);
    if (t.data) {
      setTargets({
        calories: Number(t.data.calories), protein: Number(t.data.protein),
        carbs: Number(t.data.carbs), fats: Number(t.data.fats),
      });
    } else {
      // create default row
      await supabase.from('macro_targets').insert({ user_id: user.id });
    }
    if (f.data) setFoods(f.data as MacroFood[]);
    if (l.data) setLogs(l.data as MacroLog[]);
  }, [user, today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totals = useMemo(() => sumMacros(logs), [logs]);

  const slotFoods = useMemo(
    () => foods.filter(f => f.meal_slot === activeSlot),
    [foods, activeSlot],
  );

  const slotLogs = useMemo(
    () => logs.filter(l => l.meal_slot === activeSlot),
    [logs, activeSlot],
  );

  async function logFood(food: MacroFood) {
    if (!user) return;
    const { error } = await supabase.from('macro_logs').insert({
      user_id: user.id,
      log_date: today,
      meal_slot: food.meal_slot,
      food_id: food.id,
      food_name: food.name,
      emoji: food.emoji,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      quantity: 1,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${food.emoji} ${food.name}`);
    fetchAll();
  }

  async function removeLog(id: string) {
    const { error } = await supabase.from('macro_logs').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  }

  async function adjustLogQty(log: MacroLog, delta: number) {
    const next = Math.max(0, Math.round((log.quantity + delta) * 4) / 4);
    if (next === 0) return removeLog(log.id);
    const { error } = await supabase.from('macro_logs').update({ quantity: next }).eq('id', log.id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  }

  function openNewFood() {
    setForm({ ...EMPTY_FORM, meal_slot: activeSlot });
    setShowFoodDialog(true);
  }

  function openEditFood(f: MacroFood) {
    setForm({
      id: f.id, name: f.name, emoji: f.emoji, meal_slot: f.meal_slot,
      calories: String(f.calories), protein: String(f.protein),
      carbs: String(f.carbs), fats: String(f.fats),
    });
    setShowFoodDialog(true);
  }

  async function saveFood() {
    if (!user) return;
    if (!form.name.trim()) { toast.error('Give it a name'); return; }
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      emoji: form.emoji || '🍽️',
      meal_slot: form.meal_slot,
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fats: Number(form.fats) || 0,
    };
    const { error } = form.id
      ? await supabase.from('macro_foods').update(payload).eq('id', form.id)
      : await supabase.from('macro_foods').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? 'Updated!' : 'Tile added!');
    setShowFoodDialog(false);
    fetchAll();
  }

  async function deleteFood(id: string) {
    if (!confirm('Delete this tile?')) return;
    const { error } = await supabase.from('macro_foods').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  }

  const name = profile?.display_name || 'friend';
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <p className="text-sm text-muted-foreground">{todayStr}</p>
        <h1 className="text-xl font-bold mt-1">Hey {name}! 💪</h1>
      </div>

      {/* Macro summary */}
      <div className="px-5 mb-4 grid grid-cols-4 gap-2">
        <MacroStat label="kcal" value={totals.calories} target={targets.calories} accentClass="bg-primary" />
        <MacroStat label="P" value={totals.protein} target={targets.protein} accentClass="bg-exchange-proteins" suffix="g" />
        <MacroStat label="C" value={totals.carbs} target={targets.carbs} accentClass="bg-exchange-starches" suffix="g" />
        <MacroStat label="F" value={totals.fats} target={targets.fats} accentClass="bg-exchange-fats" suffix="g" />
      </div>

      {/* Meal slot tabs */}
      <div className="px-5 mb-3 flex gap-2 overflow-x-auto">
        {MEAL_SLOTS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSlot(s.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border whitespace-nowrap transition ${
              activeSlot === s.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-muted-foreground'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Tiles grid */}
      <div className="px-5">
        <div className={`rounded-2xl border p-3 ${SLOT_COLORS[activeSlot]}`}>
          {slotFoods.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              <div className="text-3xl mb-1">🍽️</div>
              No tiles yet for {MEAL_SLOTS.find(s => s.key === activeSlot)?.label}.
              <br />Tap + to add your first one.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {slotFoods.map(f => {
                const count = slotLogs.filter(l => l.food_id === f.id).reduce((s, l) => s + l.quantity, 0);
                return (
                  <button
                    key={f.id}
                    onClick={() => logFood(f)}
                    className="relative bg-card border rounded-xl p-3 text-left hover:bg-accent active:scale-95 transition"
                  >
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        ×{count}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-2xl">{f.emoji}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditFood(f); }}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                        aria-label="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                    <div className="font-semibold text-xs mt-1 line-clamp-2 leading-tight">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {Math.round(f.calories)} kcal
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      P{Math.round(f.protein)} · C{Math.round(f.carbs)} · F{Math.round(f.fats)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <Button
            variant="outline"
            onClick={openNewFood}
            className="w-full mt-3 rounded-xl"
          >
            <Plus size={16} className="mr-1" /> Add a tile
          </Button>
        </div>
      </div>

      {/* Logged today for this slot */}
      {slotLogs.length > 0 && (
        <div className="px-5 mt-5">
          <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wide mb-2">
            Logged for {MEAL_SLOTS.find(s => s.key === activeSlot)?.label}
          </h3>
          <div className="space-y-2">
            {slotLogs.map(l => (
              <div key={l.id} className="bg-card border rounded-xl p-2 flex items-center gap-2">
                <span className="text-xl">{l.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{l.food_name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {Math.round(l.calories * l.quantity)} kcal · P{Math.round(l.protein * l.quantity)} · C{Math.round(l.carbs * l.quantity)} · F{Math.round(l.fats * l.quantity)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjustLogQty(l, -0.25)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Minus size={12} /></button>
                  <span className="w-8 text-center text-sm font-bold">{l.quantity}×</span>
                  <button onClick={() => adjustLogQty(l, 0.25)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center"><Plus size={12} /></button>
                  <button onClick={() => removeLog(l.id)} className="text-muted-foreground hover:text-destructive ml-1"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Food dialog */}
      <Dialog open={showFoodDialog} onOpenChange={setShowFoodDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit tile' : 'New tile'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={form.emoji}
                onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                className="w-16 text-center text-2xl rounded-xl"
                maxLength={4}
              />
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Scrambled eggs + cheese"
                className="flex-1 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              {MEAL_SLOTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setForm({ ...form, meal_slot: s.key })}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border ${
                    form.meal_slot === s.key
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {s.emoji}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MacroInput label="Calories" value={form.calories} onChange={(v) => setForm({ ...form, calories: v })} />
              <MacroInput label="Protein (g)" value={form.protein} onChange={(v) => setForm({ ...form, protein: v })} />
              <MacroInput label="Carbs (g)" value={form.carbs} onChange={(v) => setForm({ ...form, carbs: v })} />
              <MacroInput label="Fats (g)" value={form.fats} onChange={(v) => setForm({ ...form, fats: v })} />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {form.id && (
              <Button variant="destructive" onClick={() => { deleteFood(form.id!); setShowFoodDialog(false); }} className="rounded-xl sm:mr-auto">
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowFoodDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={saveFood} className="rounded-xl">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MacroStat({ label, value, target, accentClass, suffix = '' }: { label: string; value: number; target: number; accentClass: string; suffix?: string }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="bg-card border rounded-xl p-2">
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">{label}</div>
      <div className="text-sm font-bold mt-0.5">
        {Math.round(value)}<span className="text-[10px] text-muted-foreground">/{Math.round(target)}{suffix}</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
        <div className={`h-full ${accentClass} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MacroInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl mt-0.5"
        placeholder="0"
      />
    </label>
  );
}
