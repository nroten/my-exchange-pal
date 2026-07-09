import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MacroFood, MacroLog, MacroTargets, MealSlot, MEAL_SLOTS, FoodKind,
  sumMacros, getCurrentMealSlot, todayYMD, tomorrowYMD, yesterdayYMD,
} from '@/types/macros';
import { Plus, Minus, X, Pencil, Check, Copy, BookOpen, BookMarked, ChevronDown, ChevronRight } from 'lucide-react';
import FoodLibraryDialog, { LibraryFood } from '@/components/FoodLibraryDialog';
import CheatsheetModal from '@/components/CheatsheetModal';

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
  kind: FoodKind;
  serving: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
}

const EMPTY_FORM: FoodFormState = {
  name: '', emoji: '🍽️', meal_slot: 'breakfast', kind: 'base', serving: '',
  calories: '', protein: '', carbs: '', fats: '',
};

type DayMode = 'today' | 'tomorrow';

export default function MacrosTracker() {
  const { user, profile } = useAuth();
  const [targets, setTargets] = useState<MacroTargets>({ calories: 2000, protein: 100, carbs: 220, fats: 70 });
  const [foods, setFoods] = useState<MacroFood[]>([]);
  const [logs, setLogs] = useState<MacroLog[]>([]);
  const [activeSlot, setActiveSlot] = useState<MealSlot>(getCurrentMealSlot());
  const [dayMode, setDayMode] = useState<DayMode>('today');
  const [showFoodDialog, setShowFoodDialog] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [form, setForm] = useState<FoodFormState>(EMPTY_FORM);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem('macro_section_collapsed') || '{}'); } catch { return {}; }
  });
  const toggleCollapsed = (key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('macro_section_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const [qtyStep, setQtyStep] = useState<0.25 | 0.1>(0.25);
  const fmtQty = (q: number) => Number(q.toFixed(2)).toString();

  const today = todayYMD();
  const tomorrow = tomorrowYMD();
  const activeDate = dayMode === 'today' ? today : tomorrow;
  const isPlanning = dayMode === 'tomorrow';

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [t, f, l] = await Promise.all([
      supabase.from('macro_targets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('macro_foods').select('*').eq('user_id', user.id).order('sort_order').order('created_at'),
      supabase.from('macro_logs').select('*').eq('user_id', user.id).in('log_date', [today, tomorrow]).order('created_at'),
    ]);
    if (t.data) {
      setTargets({
        calories: Number(t.data.calories), protein: Number(t.data.protein),
        carbs: Number(t.data.carbs), fats: Number(t.data.fats),
      });
    } else {
      await supabase.from('macro_targets').insert({ user_id: user.id });
    }
    if (f.data) setFoods(f.data as MacroFood[]);
    if (l.data) setLogs(l.data as MacroLog[]);
  }, [user, today, tomorrow]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Logs for the active day. On Today, show eaten only in totals/list.
  // On Tomorrow, show planned only.
  const dayLogs = useMemo(
    () => logs.filter(l => l.log_date === activeDate && (isPlanning ? l.is_planned : !l.is_planned)),
    [logs, activeDate, isPlanning],
  );

  // On Today, also surface planned items as "ready to confirm"
  const plannedTodayLogs = useMemo(
    () => logs.filter(l => l.log_date === today && l.is_planned),
    [logs, today],
  );

  const totals = useMemo(() => sumMacros(dayLogs), [dayLogs]);

  const slotFoods = useMemo(
    () => foods.filter(f => f.meal_slot === activeSlot),
    [foods, activeSlot],
  );

  const slotLogs = useMemo(
    () => dayLogs.filter(l => l.meal_slot === activeSlot),
    [dayLogs, activeSlot],
  );

  const slotPlannedToday = useMemo(
    () => plannedTodayLogs.filter(l => l.meal_slot === activeSlot),
    [plannedTodayLogs, activeSlot],
  );

  async function logFood(food: MacroFood) {
    if (!user) return;
    // Remember the last quantity the user logged for this tile (excluding today/tomorrow's current entries)
    let quantity = 1;
    const { data: prior } = await supabase
      .from('macro_logs')
      .select('quantity, log_date, created_at')
      .eq('user_id', user.id)
      .eq('food_id', food.id)
      .eq('is_planned', false)
      .lt('log_date', activeDate)
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);
    if (prior && prior.length > 0 && Number(prior[0].quantity) > 0) {
      quantity = Number(prior[0].quantity);
    }
    const { error } = await supabase.from('macro_logs').insert({
      user_id: user.id,
      log_date: activeDate,
      meal_slot: food.meal_slot,
      food_id: food.id,
      food_name: food.name,
      emoji: food.emoji,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fats: food.fats,
      quantity,
      is_planned: isPlanning,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(
      `${isPlanning ? 'Planned' : 'Added'} ${food.emoji} ${food.name}${quantity !== 1 ? ` ×${fmtQty(quantity)}` : ''}`
    );
    fetchAll();
  }

  async function removeLog(id: string) {
    const { error } = await supabase.from('macro_logs').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  }

  async function adjustLogQty(log: MacroLog, delta: number) {
    const next = Math.max(0, Math.round((log.quantity + delta) * 20) / 20);
    if (next === 0) return removeLog(log.id);
    const { error } = await supabase.from('macro_logs').update({ quantity: next }).eq('id', log.id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  }

  async function confirmPlanned(log: MacroLog) {
    const { error } = await supabase.from('macro_logs').update({ is_planned: false }).eq('id', log.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Confirmed ${log.emoji} ${log.food_name} ✨`);
    fetchAll();
  }

  async function confirmAllPlanned() {
    if (plannedTodayLogs.length === 0) return;
    const ids = plannedTodayLogs.map(l => l.id);
    const { error } = await supabase.from('macro_logs').update({ is_planned: false }).in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`Confirmed ${ids.length} planned items 🎉`);
    fetchAll();
  }

  async function copyFromDay(sourceDate: string) {
    if (!user) return;
    // Read source: eaten if today, else planned
    const { data, error } = await supabase
      .from('macro_logs').select('*')
      .eq('user_id', user.id).eq('log_date', sourceDate);
    if (error) { toast.error(error.message); return; }
    const source = (data || []).filter(l =>
      sourceDate === today ? !l.is_planned : true,
    );
    if (source.length === 0) {
      toast.info('Nothing to copy from that day.');
      return;
    }
    const rows = source.map(l => ({
      user_id: user.id,
      log_date: activeDate,
      meal_slot: l.meal_slot,
      food_id: l.food_id,
      food_name: l.food_name,
      emoji: l.emoji,
      calories: l.calories,
      protein: l.protein,
      carbs: l.carbs,
      fats: l.fats,
      quantity: l.quantity,
      is_planned: isPlanning,
    }));
    const { error: insErr } = await supabase.from('macro_logs').insert(rows);
    if (insErr) { toast.error(insErr.message); return; }
    toast.success(`Copied ${rows.length} items 💪`);
    fetchAll();
  }

  async function clearDay() {
    if (!user) return;
    if (!confirm(`Clear all ${isPlanning ? 'planned' : 'logged'} items for this day?`)) return;
    const { error } = await supabase.from('macro_logs').delete()
      .eq('user_id', user.id)
      .eq('log_date', activeDate)
      .eq('is_planned', isPlanning);
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
      kind: (f.kind as FoodKind) || 'base',
      serving: f.serving || '',
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
      kind: form.kind,
      serving: form.serving.trim() || null,
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

  async function addFromLibrary(f: LibraryFood, slot: MealSlot) {
    if (!user) return;
    // Avoid duplicate by name+slot
    const exists = foods.some(
      x => x.meal_slot === slot && x.name.toLowerCase() === f.name.toLowerCase(),
    );
    if (exists) { toast.info(`${f.name} is already in your tiles.`); return; }
    const { error } = await supabase.from('macro_foods').insert({
      user_id: user.id,
      name: f.name,
      emoji: f.emoji,
      meal_slot: slot,
      serving: f.serving || null,
      calories: f.calories,
      protein: f.protein,
      carbs: f.carbs,
      fats: f.fat,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Added ${f.emoji} ${f.name} to ${slot}`);
    fetchAll();
  }

  async function deleteFood(id: string) {
    if (!confirm('Delete this tile?')) return;
    const { error } = await supabase.from('macro_foods').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    fetchAll();
  }

  const name = profile?.display_name || 'friend';
  const headerDate = new Date(activeDate + 'T00:00:00');
  const dateStr = headerDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Forecast/remaining for planning
  const remaining = {
    calories: Math.max(0, targets.calories - totals.calories),
    protein: Math.max(0, targets.protein - totals.protein),
    carbs: Math.max(0, targets.carbs - totals.carbs),
    fats: Math.max(0, targets.fats - totals.fats),
  };

  return (
    <div className="min-h-screen bg-macro-bg text-macro-text pb-24">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-macro-muted">{dateStr}</p>
          <h1 className="text-xl font-bold mt-1 text-macro-text">
            {isPlanning ? `Planning tomorrow 🗓️` : `Hey ${name}! 💪`}
          </h1>
        </div>
        <button
          onClick={() => setShowCheatsheet(true)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-macro-surface border border-macro-border text-macro-text text-xs font-semibold hover:border-macro-primary/60 transition"
        >
          <BookMarked size={14} /> Cheatsheet
        </button>
      </div>

      {/* Today / Tomorrow toggle */}
      <div className="px-5 mb-3">
        <div className="inline-flex bg-macro-surface border border-macro-border rounded-full p-1">
          {(['today', 'tomorrow'] as DayMode[]).map(m => (
            <button
              key={m}
              onClick={() => setDayMode(m)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                dayMode === m
                  ? 'bg-macro-primary text-macro-primary-foreground'
                  : 'text-macro-muted hover:text-macro-text'
              }`}
            >
              {m === 'today' ? '📅 Today' : '🗓️ Tomorrow'}
            </button>
          ))}
        </div>
      </div>

      {/* Macro summary */}
      <div className="px-5 mb-2 grid grid-cols-4 gap-2">
        <MacroStat label="kcal" value={totals.calories} target={targets.calories} accentClass="bg-macro-calories" />
        <MacroStat label="P" value={totals.protein} target={targets.protein} accentClass="bg-macro-protein" suffix="g" />
        <MacroStat label="C" value={totals.carbs} target={targets.carbs} accentClass="bg-macro-carbs" suffix="g" />
        <MacroStat label="F" value={totals.fats} target={targets.fats} accentClass="bg-macro-fats" suffix="g" />
      </div>

      {/* Planning helper line */}
      {isPlanning && (
        <div className="px-5 mb-3 text-[11px] text-macro-muted">
          Remaining to plan: <span className="text-macro-calories font-semibold">{Math.round(remaining.calories)} kcal</span>
          {' · '}<span className="text-macro-protein font-semibold">P{Math.round(remaining.protein)}g</span>
          {' · '}<span className="text-macro-carbs font-semibold">C{Math.round(remaining.carbs)}g</span>
          {' · '}<span className="text-macro-fats font-semibold">F{Math.round(remaining.fats)}g</span>
        </div>
      )}

      {/* Quick actions */}
      <div className="px-5 mb-3 flex flex-wrap gap-2">
        {isPlanning ? (
          <>
            <Button size="sm" variant="outline" onClick={() => copyFromDay(today)}
              className="rounded-full bg-macro-surface border-macro-border text-macro-text hover:bg-macro-surface-2 hover:text-macro-text">
              <Copy size={14} className="mr-1" /> Copy today
            </Button>
            <Button size="sm" variant="outline" onClick={() => copyFromDay(yesterdayYMD())}
              className="rounded-full bg-macro-surface border-macro-border text-macro-text hover:bg-macro-surface-2 hover:text-macro-text">
              <Copy size={14} className="mr-1" /> Copy yesterday
            </Button>
            {dayLogs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearDay}
                className="rounded-full text-macro-muted hover:text-destructive">
                Clear plan
              </Button>
            )}
          </>
        ) : (
          plannedTodayLogs.length > 0 && (
            <Button size="sm" onClick={confirmAllPlanned}
              className="rounded-full bg-macro-primary text-macro-primary-foreground">
              <Check size={14} className="mr-1" /> Confirm all planned ({plannedTodayLogs.length})
            </Button>
          )
        )}
      </div>

      {/* Meal slot tabs */}
      <div className="px-5 mb-3 flex gap-2 overflow-x-auto">
        {MEAL_SLOTS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSlot(s.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border whitespace-nowrap transition ${
              activeSlot === s.key
                ? 'bg-macro-primary text-macro-primary-foreground border-macro-primary'
                : 'bg-macro-surface border-macro-border text-macro-muted'
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      {/* Tiles grid */}
      <div className="px-5">
        <div className={`rounded-2xl border bg-gradient-to-br p-3 ${SLOT_ACCENT[activeSlot]}`}>
          {slotFoods.length === 0 ? (
            <div className="text-center py-6 text-sm text-macro-muted">
              <div className="text-3xl mb-1">🍽️</div>
              No tiles yet for {MEAL_SLOTS.find(s => s.key === activeSlot)?.label}.
              <br />Tap + to add your first one.
            </div>
          ) : (
            (() => {
              type Section = 'base' | 'variation' | 'infrequent';
              const sectionOf = (k?: string | null): Section =>
                k === 'infrequent' ? 'infrequent'
                  : (k === 'variation' || k === 'addon') ? 'variation'
                  : 'base';
              const kindForSection = (s: Section, existingKind?: string | null): FoodKind =>
                s === 'infrequent' ? 'infrequent'
                  : s === 'variation'
                    ? (existingKind === 'addon' ? 'addon' : 'variation')
                    : 'base';

              const bases = slotFoods
                .filter(f => sectionOf(f.kind) === 'base')
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              const variations = slotFoods
                .filter(f => sectionOf(f.kind) === 'variation')
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
              const infrequent = slotFoods
                .filter(f => sectionOf(f.kind) === 'infrequent')
                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

              const itemsForSection = (s: Section) =>
                s === 'base' ? bases : s === 'variation' ? variations : infrequent;

              const onDragStartTile = (e: React.DragEvent, f: MacroFood) => {
                e.dataTransfer.setData('text/plain', f.id);
                e.dataTransfer.effectAllowed = 'move';
              };
              const persistOrder = async (items: MacroFood[]) => {
                await Promise.all(
                  items.map((it, idx) =>
                    supabase.from('macro_foods').update({ sort_order: idx }).eq('id', it.id)
                  )
                );
              };
              const onDropOnTile = async (e: React.DragEvent, targetFood: MacroFood) => {
                e.preventDefault();
                e.stopPropagation();
                const id = e.dataTransfer.getData('text/plain');
                if (!id || id === targetFood.id) return;
                const dragged = foods.find(x => x.id === id);
                if (!dragged) return;
                const targetSection: Section = sectionOf(targetFood.kind);
                const wantKind: FoodKind = kindForSection(targetSection, dragged.kind);
                const sectionItems = itemsForSection(targetSection).filter(x => x.id !== id);
                const targetIdx = sectionItems.findIndex(x => x.id === targetFood.id);
                const insertIdx = targetIdx < 0 ? sectionItems.length : targetIdx;
                const movedItem: MacroFood = { ...dragged, kind: wantKind };
                const newOrder = [
                  ...sectionItems.slice(0, insertIdx),
                  movedItem,
                  ...sectionItems.slice(insertIdx),
                ];
                setFoods(prev => {
                  const others = prev.filter(
                    x => !(x.meal_slot === activeSlot && sectionOf(x.kind) === targetSection) && x.id !== id
                  );
                  const updatedSection = newOrder.map((it, idx) => ({ ...it, sort_order: idx }));
                  return [...others, ...updatedSection];
                });
                if ((dragged.kind || 'base') !== wantKind) {
                  await supabase.from('macro_foods').update({ kind: wantKind }).eq('id', id);
                }
                await persistOrder(newOrder);
              };
              const onDropZone = async (e: React.DragEvent, target: Section) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (!id) return;
                const food = foods.find(x => x.id === id);
                if (!food) return;
                const currentKind = (food.kind || 'base') as FoodKind;
                const wantKind: FoodKind = kindForSection(target, food.kind);
                const sectionItems = itemsForSection(target).filter(x => x.id !== id);
                const movedItem: MacroFood = { ...food, kind: wantKind };
                const newOrder = [...sectionItems, movedItem];
                setFoods(prev => prev.map(x => x.id === id ? { ...x, kind: wantKind } : x));
                if (currentKind !== wantKind) {
                  const { error } = await supabase.from('macro_foods').update({ kind: wantKind }).eq('id', id);
                  if (error) { toast.error(error.message); fetchAll(); return; }
                  const labels: Record<Section, string> = { base: 'Meal Base', variation: 'Variations', infrequent: 'Infrequent' };
                  toast.success(`Moved to ${labels[target]}`);
                }
                await persistOrder(newOrder);
              };
              const renderTile = (f: MacroFood) => {
                const count = slotLogs.filter(l => l.food_id === f.id).reduce((s, l) => s + l.quantity, 0);
                const isVariation = f.kind === 'variation';
                const isAddon = f.kind === 'addon';
                const isInfrequent = f.kind === 'infrequent';
                return (
                  <button
                    key={f.id}
                    draggable
                    onDragStart={(e) => onDragStartTile(e, f)}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => onDropOnTile(e, f)}
                    onClick={() => logFood(f)}
                    className={`relative rounded-xl p-3 text-left active:scale-95 transition border cursor-grab active:cursor-grabbing ${
                      isVariation
                        ? 'bg-gradient-to-br from-macro-carbs/10 to-macro-fats/10 border-dashed border-macro-carbs/60 hover:border-macro-carbs'
                        : isAddon
                          ? 'bg-macro-surface border-macro-fats/40 border-dotted hover:border-macro-fats'
                          : isInfrequent
                            ? 'bg-macro-surface/60 border-macro-border/60 hover:border-macro-primary/40 opacity-90'
                            : 'bg-macro-surface border-macro-border hover:bg-macro-surface-2 hover:border-macro-primary/50'
                    }`}
                  >
                    {isAddon && (
                      <span className="absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full leading-none shadow-sm bg-macro-fats text-macro-bg">
                        ADD-ON
                      </span>
                    )}
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-macro-primary text-macro-primary-foreground text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        ×{fmtQty(count)}
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-2xl">{f.emoji}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditFood(f); }}
                        className="text-macro-muted hover:text-macro-text p-0.5"
                        aria-label="Edit"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                    <div className="font-semibold text-xs mt-1 line-clamp-2 leading-tight text-macro-text">{f.name}</div>
                    {f.serving && (
                      <div className="text-[10px] text-macro-muted italic leading-tight">{f.serving}</div>
                    )}
                    <div className="text-[10px] text-macro-calories font-semibold mt-1">
                      {Math.round(f.calories)} kcal
                    </div>
                    <div className="text-[10px] text-macro-muted">
                      <span className="text-macro-protein">P{Math.round(f.protein)}</span>
                      {' · '}
                      <span className="text-macro-carbs">C{Math.round(f.carbs)}</span>
                      {' · '}
                      <span className="text-macro-fats">F{Math.round(f.fats)}</span>
                    </div>
                  </button>
                );
              };
              const DropZone = ({ label, target, items }: { label: string; target: Section; items: MacroFood[] }) => {
                const key = `${activeSlot}:${target}`;
                const isCollapsed = !!collapsed[key];
                return (
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                    onDrop={(e) => onDropZone(e, target)}
                    className="rounded-xl border border-dashed border-macro-border/60 p-2"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(key)}
                      className="w-full flex items-center gap-2 mb-2 px-1 group"
                      aria-expanded={!isCollapsed}
                    >
                      <span className="text-macro-muted group-hover:text-macro-text transition">
                        {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                      </span>
                      <div className="h-px flex-1 bg-macro-border" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-macro-muted group-hover:text-macro-text">
                        {label}{items.length > 0 && ` (${items.length})`}
                      </span>
                      <div className="h-px flex-1 bg-macro-border" />
                    </button>
                    {!isCollapsed && (
                      items.length === 0 ? (
                        <div className="text-[11px] text-macro-muted italic text-center py-4">
                          Drop items here
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {items.map(renderTile)}
                        </div>
                      )
                    )}
                  </div>
                );
              };
              return (
                <div className="space-y-3">
                  <DropZone label="Meal Base" target="base" items={bases} />
                  <DropZone label="Variations" target="variation" items={variations} />
                  <DropZone label="Infrequent" target="infrequent" items={infrequent} />
                </div>
              );
            })()
          )}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button
              variant="outline"
              onClick={() => setShowLibrary(true)}
              className="rounded-xl bg-macro-surface border-macro-border text-macro-text hover:bg-macro-surface-2 hover:text-macro-text"
            >
              <BookOpen size={16} className="mr-1" /> Library
            </Button>
            <Button
              variant="outline"
              onClick={openNewFood}
              className="rounded-xl bg-macro-surface border-macro-border text-macro-text hover:bg-macro-surface-2 hover:text-macro-text"
            >
              <Plus size={16} className="mr-1" /> Custom
            </Button>
          </div>
        </div>
      </div>

      {/* Planned for today (only on Today view, when there are planned items in this slot) */}
      {!isPlanning && slotPlannedToday.length > 0 && (
        <div className="px-5 mt-5">
          <h3 className="text-xs font-bold uppercase text-macro-muted tracking-wide mb-2">
            🗓️ Planned for {MEAL_SLOTS.find(s => s.key === activeSlot)?.label} — tap ✓ when eaten
          </h3>
          <div className="space-y-2">
            {slotPlannedToday.map(l => (
              <div key={l.id} className="bg-macro-surface border border-dashed border-macro-primary/50 rounded-xl p-2 flex items-center gap-2">
                <span className="text-xl opacity-80">{l.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-macro-text">{l.food_name} <span className="text-[10px] text-macro-muted">×{fmtQty(l.quantity)}</span></div>
                  <div className="text-[11px] text-macro-muted">
                    <span className="text-macro-calories">{Math.round(l.calories * l.quantity)} kcal</span>
                    {' · '}<span className="text-macro-protein">P{Math.round(l.protein * l.quantity)}</span>
                    {' · '}<span className="text-macro-carbs">C{Math.round(l.carbs * l.quantity)}</span>
                    {' · '}<span className="text-macro-fats">F{Math.round(l.fats * l.quantity)}</span>
                  </div>
                </div>
                <button onClick={() => confirmPlanned(l)}
                  className="w-8 h-8 rounded-full bg-macro-primary text-macro-primary-foreground flex items-center justify-center"
                  aria-label="Confirm eaten">
                  <Check size={14} />
                </button>
                <button onClick={() => removeLog(l.id)} className="text-macro-muted hover:text-destructive ml-1">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day list (eaten on Today, planned on Tomorrow) */}
      {slotLogs.length > 0 && (
        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase text-macro-muted tracking-wide">
              {isPlanning ? 'Planned' : 'Logged'} for {MEAL_SLOTS.find(s => s.key === activeSlot)?.label}
            </h3>
            <div className="inline-flex bg-macro-surface border border-macro-border rounded-full p-0.5">
              {[0.25, 0.1].map(step => (
                <button
                  key={step}
                  onClick={() => setQtyStep(step as 0.25 | 0.1)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition ${
                    qtyStep === step
                      ? 'bg-macro-primary text-macro-primary-foreground'
                      : 'text-macro-muted hover:text-macro-text'
                  }`}
                >
                  {step === 0.25 ? '¼' : '10%'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {slotLogs.map(l => (
              <div key={l.id} className="bg-macro-surface border border-macro-border rounded-xl p-2 flex items-center gap-2">
                <span className="text-xl">{l.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-macro-text">{l.food_name}</div>
                  <div className="text-[11px] text-macro-muted">
                    <span className="text-macro-calories">{Math.round(l.calories * l.quantity)} kcal</span>
                    {' · '}<span className="text-macro-protein">P{Math.round(l.protein * l.quantity)}</span>
                    {' · '}<span className="text-macro-carbs">C{Math.round(l.carbs * l.quantity)}</span>
                    {' · '}<span className="text-macro-fats">F{Math.round(l.fats * l.quantity)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjustLogQty(l, -qtyStep)} className="w-7 h-7 rounded-full bg-macro-surface-2 text-macro-text flex items-center justify-center"><Minus size={12} /></button>
                  <span className="w-8 text-center text-sm font-bold text-macro-text">{fmtQty(l.quantity)}×</span>
                  <button onClick={() => adjustLogQty(l, qtyStep)} className="w-7 h-7 rounded-full bg-macro-surface-2 text-macro-text flex items-center justify-center"><Plus size={12} /></button>
                  <button onClick={() => removeLog(l.id)} className="text-macro-muted hover:text-destructive ml-1"><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cheatsheet */}
      <CheatsheetModal open={showCheatsheet} onOpenChange={setShowCheatsheet} />

      {/* Food library dialog */}
      <FoodLibraryDialog
        open={showLibrary}
        onOpenChange={setShowLibrary}
        initialSlot={activeSlot}
        onAdd={addFromLibrary}
        existingBySlot={foods.reduce((acc, f) => {
          (acc[f.meal_slot] ||= new Set()).add(f.name.toLowerCase());
          return acc;
        }, {} as Record<string, Set<string>>)}
      />

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
            <div className="flex gap-2">
              {(['base','variation','addon','infrequent'] as FoodKind[]).map(k => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, kind: k })}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold border capitalize ${
                    form.kind === k
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-muted-foreground'
                  }`}
                >
                  {k === 'base' ? '🧱 Base' : k === 'variation' ? '🧩 Combo' : k === 'addon' ? '➕ Add-on' : '🌙 Rare'}
                </button>
              ))}
            </div>
            <Input
              value={form.serving}
              onChange={(e) => setForm({ ...form, serving: e.target.value })}
              placeholder="Serving size (e.g. 1 cup, 2 oz)"
              className="rounded-xl"
            />
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
    <div className="bg-macro-surface border border-macro-border rounded-xl p-2">
      <div className="text-[10px] uppercase font-bold text-macro-muted tracking-wide">{label}</div>
      <div className="text-sm font-bold mt-0.5 text-macro-text">
        {Math.round(value)}<span className="text-[10px] text-macro-muted">/{Math.round(target)}{suffix}</span>
      </div>
      <div className="h-1 bg-macro-surface-2 rounded-full overflow-hidden mt-1">
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
