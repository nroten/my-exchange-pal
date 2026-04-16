import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeCategory, MealFoodEntry } from '@/types/nutrition';

const CATEGORY_BAR_COLORS: Record<ExchangeCategory, string> = {
  starches: 'bg-exchange-starches',
  fruits: 'bg-exchange-fruits',
  vegetables: 'bg-exchange-vegetables',
  proteins: 'bg-exchange-proteins',
  dairy: 'bg-exchange-dairy',
  fats: 'bg-exchange-fats',
};

export default function History() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState<Record<string, any[]>>({});
  const [targets, setTargets] = useState<Record<ExchangeCategory, number>>({
    starches: 6, fruits: 3, vegetables: 5, proteins: 6, dairy: 3, fats: 4,
  });
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchWeek = async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + weekOffset * 7);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];

      const [mealsRes, targetsRes] = await Promise.all([
        supabase.from('meal_logs').select('*')
          .eq('user_id', user.id)
          .gte('log_date', startStr)
          .lte('log_date', endStr)
          .order('created_at'),
        supabase.from('daily_targets').select('*').eq('user_id', user.id).single(),
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

      const grouped: Record<string, any[]> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        grouped[d.toISOString().split('T')[0]] = [];
      }
      for (const meal of mealsRes.data || []) {
        if (grouped[meal.log_date]) grouped[meal.log_date].push(meal);
      }
      setWeekData(grouped);
    };
    fetchWeek();
  }, [user, weekOffset]);

  const days = Object.keys(weekData).sort();

  return (
    <div className="min-h-screen bg-background p-5 pb-24">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setWeekOffset(w => w - 1)} className="text-primary font-semibold text-sm">← Prev</button>
        <h2 className="font-bold">Weekly View 📅</h2>
        <button
          onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
          disabled={weekOffset >= 0}
          className="text-primary font-semibold text-sm disabled:opacity-30"
        >Next →</button>
      </div>

      <div className="space-y-3">
        {days.map(day => {
          const meals = weekData[day] || [];
          const dayTotals: Record<ExchangeCategory, number> = {
            starches: 0, fruits: 0, vegetables: 0, proteins: 0, dairy: 0, fats: 0,
          };
          for (const m of meals) {
            for (const cat of EXCHANGE_CATEGORIES) {
              dayTotals[cat] += Number(m[`total_${cat}`]) || 0;
            }
          }
          const dateObj = new Date(day + 'T12:00:00');
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const dateNum = dateObj.getDate();
          const isToday = day === new Date().toISOString().split('T')[0];

          return (
            <div key={day}>
              <button
                onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                className={`w-full bg-card border rounded-2xl p-3 text-left ${isToday ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-xs font-bold ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <span>{dayName}</span>
                    <span>{dateNum}</span>
                  </div>
                  <div className="flex-1 flex gap-1">
                    {EXCHANGE_CATEGORIES.map(cat => {
                      const pct = targets[cat] > 0 ? Math.min(dayTotals[cat] / targets[cat], 1) : 0;
                      return (
                        <div key={cat} className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${CATEGORY_BAR_COLORS[cat]}`}
                            style={{ width: `${pct * 100}%`, transition: 'width 0.5s ease-out' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </button>
              {expandedDay === day && meals.length > 0 && (
                <div className="ml-4 mt-2 space-y-2">
                  {meals.map(m => (
                    <div key={m.id} className="bg-card/50 border rounded-xl p-3 text-sm">
                      <div className="font-semibold">{m.meal_label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {((m.food_items as MealFoodEntry[]) || []).map((f, i) => (
                          <span key={i}>{i > 0 ? ', ' : ''}{f.foodName}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {expandedDay === day && meals.length === 0 && (
                <p className="ml-4 mt-2 text-xs text-muted-foreground">No meals logged</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
