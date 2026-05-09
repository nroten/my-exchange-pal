import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProgressRing from '@/components/ProgressRing';
import MealCard from '@/components/MealCard';
import LogMeal from '@/components/LogMeal';
import Celebration, { getRandomCelebration } from '@/components/Celebrations';
import {
  EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeValues,
  ExchangeCategory, EMPTY_EXCHANGES, MealFoodEntry,
} from '@/types/nutrition';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BookMarked, ChevronLeft, ChevronRight } from 'lucide-react';
import CheatsheetModal from '@/components/CheatsheetModal';
import { getESTDateString, addDaysToDateString, formatDateLabel } from '@/lib/dateUtils';

function getGreeting(name: string, progress: number, hour: number): string {
  if (progress >= 1) return `You did it, ${name}! Every goal hit today. Amazing work! 🌟`;
  if (hour < 12 && progress < 0.3) return `Great start, ${name}! You've got the whole day ahead. ☀️`;
  if (hour < 17 && progress >= 0.4) return `Keep it going, ${name} — you're right on pace! 💪`;
  if (hour < 17 && progress < 0.4) return `Heads up, ${name} — try to fit in a snack to catch up! 🍎`;
  if (hour >= 17 && progress >= 0.7) return `Almost there, ${name}! Just a little more to go! ✨`;
  return `You've got this, ${name}! Every bite counts. 🧡`;
}

export default function Dashboard() {
  const { user, profile, signOut, hasSupporterRole, setActiveView } = useAuth();
  const [targets, setTargets] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [todayTotals, setTodayTotals] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [meals, setMeals] = useState<any[]>([]);
  const [showLogMeal, setShowLogMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [encouragement, setEncouragement] = useState<any>(null);
  const [celebration, setCelebration] = useState<ReturnType<typeof getRandomCelebration> | null>(null);
  const [prevCompletedCount, setPrevCompletedCount] = useState<number | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getESTDateString());
  const todayStr = getESTDateString();
  const isToday = selectedDate === todayStr;

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = selectedDate;

    const [targetsRes, mealsRes, msgRes] = await Promise.all([
      supabase.from('daily_targets').select('*').eq('user_id', user.id).single(),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('created_at'),
      supabase.from('encouragement_messages').select('*').eq('to_user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false }).limit(1),
    ]);

    let newTargets = { ...EMPTY_EXCHANGES };
    if (targetsRes.data) {
      newTargets = {
        starches: targetsRes.data.starches,
        fruits: targetsRes.data.fruits,
        vegetables: targetsRes.data.vegetables,
        proteins: targetsRes.data.proteins,
        dairy: targetsRes.data.dairy,
        fats: targetsRes.data.fats,
      };
      setTargets(newTargets);
    }

    if (mealsRes.data) {
      setMeals(mealsRes.data);
      const totals = { ...EMPTY_EXCHANGES };
      for (const m of mealsRes.data) {
        for (const cat of EXCHANGE_CATEGORIES) {
          totals[cat] += Number(m[`total_${cat}` as keyof typeof m]) || 0;
        }
      }
      setTodayTotals(totals);

      // Check if a new category was just completed → celebration!
      const completedNow = EXCHANGE_CATEGORIES.filter(c => totals[c] >= newTargets[c] && newTargets[c] > 0).length;
      if (prevCompletedCount !== null && completedNow > prevCompletedCount) {
        if (completedNow === 6) {
          setCelebration('stars'); // All goals = stars!
        } else {
          setCelebration(getRandomCelebration());
        }
      }
      setPrevCompletedCount(completedNow);
    }

    if (msgRes.data && msgRes.data.length > 0) {
      setEncouragement(msgRes.data[0]);
    }
  }, [user, prevCompletedCount, selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const overallProgress = targets.starches > 0
    ? EXCHANGE_CATEGORIES.reduce((sum, c) => sum + Math.min(todayTotals[c] / targets[c], 1), 0) / 6
    : 0;

  const hour = new Date().getHours();
  const name = profile?.display_name || 'friend';
  const greeting = getGreeting(name, overallProgress, hour);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleDeleteMeal = async (id: string) => {
    const { error } = await supabase.from('meal_logs').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Meal removed');
    fetchData();
  };

  const dismissEncouragement = async () => {
    if (!encouragement) return;
    await supabase.from('encouragement_messages').update({ is_dismissed: true }).eq('id', encouragement.id);
    setEncouragement(null);
    // Show hearts when dismissing an encouragement message
    setCelebration('hearts');
  };

  return (
    <div className="min-h-screen bg-background pb-36">
      {celebration && (
        <Celebration type={celebration} onDone={() => setCelebration(null)} />
      )}

      {showLogMeal && (
        <LogMeal
          onClose={() => { setShowLogMeal(false); setEditingMeal(null); }}
          onSaved={fetchData}
          editingMeal={editingMeal}
          logDate={selectedDate}
        />
      )}

      {/* Header with logo */}
      <div className="px-5 pt-6 pb-4 flex items-start gap-3">
        <img src="/logo-512.png" alt="My Nutrition Tracker" width={40} height={40} className="rounded-xl shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{today}</p>
          <p className="text-base font-semibold mt-1">{greeting}</p>
        </div>
        <button
          onClick={() => setShowCheatsheet(true)}
          className="shrink-0 bg-card border border-border hover:bg-muted transition-colors rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1"
          title="Open cheatsheet"
        >
          <BookMarked size={12} /> Cheatsheet
        </button>
        {hasSupporterRole && (
          <button
            onClick={() => setActiveView('supporter')}
            className="shrink-0 bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary/30 transition-colors rounded-full px-3 py-1.5 text-xs font-bold flex items-center gap-1"
            title="Switch to supporter view"
          >
            🧡 Supporter
          </button>
        )}
      </div>

      <CheatsheetModal open={showCheatsheet} onOpenChange={setShowCheatsheet} mode="exchanges" />

      {/* Encouragement banner */}
      {encouragement && (
        <div className="mx-5 mb-4 bg-secondary/20 border border-secondary/30 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary">🧡 From your supporter</p>
            <p className="text-sm mt-0.5">{encouragement.message}</p>
          </div>
          <button onClick={dismissEncouragement} className="text-xs text-muted-foreground ml-2">✕</button>
        </div>
      )}

      {/* Daily summary banner */}
      <div className="px-5 mb-3">
        {(() => {
          const completed = EXCHANGE_CATEGORIES.filter(c => targets[c] > 0 && todayTotals[c] >= targets[c]).length;
          const pct = Math.round(overallProgress * 100);
          return (
            <div className="bg-card border rounded-2xl p-3 flex items-center gap-3">
              <div className="text-3xl">{completed === 6 ? '🌟' : completed >= 3 ? '💪' : '🌱'}</div>
              <div className="flex-1">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold">{completed} of 6 goals hit</span>
                  <span className="text-xs text-muted-foreground">{pct}% of day</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Progress Rings — fixed 3×2 grid, no scrolling */}
      <div className="px-5 mb-6">
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {EXCHANGE_CATEGORIES.map(cat => (
            <ProgressRing
              key={cat}
              value={todayTotals[cat]}
              target={targets[cat]}
              label={CATEGORY_META[cat].label}
              emoji={CATEGORY_META[cat].emoji}
              colorClass={CATEGORY_META[cat].color}
            />
          ))}
        </div>
      </div>

      {/* Meal List */}
      <div className="px-5 space-y-3">
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Today's Meals</h2>
        {meals.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No meals logged yet today. Tap below to get started! 🍽️
          </p>
        )}
        {meals.map(meal => (
          <MealCard
            key={meal.id}
            mealLabel={meal.meal_label}
            totals={{
              starches: meal.total_starches,
              fruits: meal.total_fruits,
              vegetables: meal.total_vegetables,
              proteins: meal.total_proteins,
              dairy: meal.total_dairy,
              fats: meal.total_fats,
            }}
            foodItems={(meal.food_items as MealFoodEntry[]) || []}
            onEdit={() => {
              setEditingMeal({
                id: meal.id,
                meal_label: meal.meal_label,
                food_items: meal.food_items as MealFoodEntry[],
              });
              setShowLogMeal(true);
            }}
            onDelete={() => handleDeleteMeal(meal.id)}
          />
        ))}
      </div>

      {/* Bottom Log Button — sits above the bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-20">
        <Button
          onClick={() => { setEditingMeal(null); setShowLogMeal(true); }}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-lg"
        >
          Log a meal or snack 🍽️
        </Button>
      </div>
    </div>
  );
}
