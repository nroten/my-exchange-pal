import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProgressRing from '@/components/ProgressRing';
import MealCard from '@/components/MealCard';
import LogMeal from '@/components/LogMeal';
import {
  EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeValues,
  ExchangeCategory, EMPTY_EXCHANGES, MealFoodEntry,
} from '@/types/nutrition';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

function getGreeting(name: string, progress: number, hour: number): string {
  if (progress >= 1) return `You did it, ${name}! Every goal hit today. Amazing work! 🌟`;
  if (hour < 12 && progress < 0.3) return `Great start, ${name}! You've got the whole day ahead. ☀️`;
  if (hour < 17 && progress >= 0.4) return `Keep it going, ${name} — you're right on pace! 💪`;
  if (hour < 17 && progress < 0.4) return `Heads up, ${name} — try to fit in a snack to catch up! 🍎`;
  if (hour >= 17 && progress >= 0.7) return `Almost there, ${name}! Just a little more to go! ✨`;
  return `You've got this, ${name}! Every bite counts. 💜`;
}

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const [targets, setTargets] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [todayTotals, setTodayTotals] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [meals, setMeals] = useState<any[]>([]);
  const [showLogMeal, setShowLogMeal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const [encouragement, setEncouragement] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'settings'>('today');

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [targetsRes, mealsRes, msgRes] = await Promise.all([
      supabase.from('daily_targets').select('*').eq('user_id', user.id).single(),
      supabase.from('meal_logs').select('*').eq('user_id', user.id).eq('log_date', today).order('created_at'),
      supabase.from('encouragement_messages').select('*').eq('to_user_id', user.id).eq('is_dismissed', false).order('created_at', { ascending: false }).limit(1),
    ]);

    if (targetsRes.data) {
      setTargets({
        starches: targetsRes.data.starches,
        fruits: targetsRes.data.fruits,
        vegetables: targetsRes.data.vegetables,
        proteins: targetsRes.data.proteins,
        dairy: targetsRes.data.dairy,
        fats: targetsRes.data.fats,
      });
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
    }

    if (msgRes.data && msgRes.data.length > 0) {
      setEncouragement(msgRes.data[0]);
    }
  }, [user]);

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
  };

  return (
    <div className="min-h-screen bg-background pb-36">
      {showLogMeal && (
        <LogMeal
          onClose={() => { setShowLogMeal(false); setEditingMeal(null); }}
          onSaved={fetchData}
          editingMeal={editingMeal}
        />
      )}

      {/* Header with logo */}
      <div className="px-5 pt-6 pb-4 flex items-start gap-3">
        <img src="/logo-512.png" alt="My Nutrition Tracker" width={40} height={40} className="rounded-xl shrink-0" />
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <p className="text-base font-semibold mt-1">{greeting}</p>
        </div>
      </div>

      {/* Encouragement banner */}
      {encouragement && (
        <div className="mx-5 mb-4 bg-secondary/20 border border-secondary/30 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary">💜 From your supporter</p>
            <p className="text-sm mt-0.5">{encouragement.message}</p>
          </div>
          <button onClick={dismissEncouragement} className="text-xs text-muted-foreground ml-2">✕</button>
        </div>
      )}

      {/* Progress Rings */}
      <div className="px-5 mb-6">
        <div className="flex justify-between overflow-x-auto gap-2 pb-2">
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

      {/* Bottom Log Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
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
