import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ProgressRing from '@/components/ProgressRing';
import {
  EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeValues,
  ExchangeCategory, EMPTY_EXCHANGES, MealFoodEntry,
} from '@/types/nutrition';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const PRESET_MESSAGES = [
  "So proud of you! 💜",
  "Great choices today! 🌟",
  "You're doing amazing! 💪",
  "Keep it up, superstar! ⭐",
];

export default function ParentView() {
  const { user, signOut, hasTrackerRole, setActiveView } = useAuth();
  const [connection, setConnection] = useState<any>(null);
  const [connectedProfile, setConnectedProfile] = useState<any>(null);
  const [targets, setTargets] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [todayTotals, setTodayTotals] = useState<ExchangeValues>({ ...EMPTY_EXCHANGES });
  const [meals, setMeals] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekData, setWeekData] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const { data: conns } = await supabase.from('parent_connections')
      .select('*').eq('parent_user_id', user.id).eq('status', 'active');

    if (!conns || conns.length === 0) { setConnection(null); return; }
    const conn = conns[0];
    setConnection(conn);

    const today = new Date().toISOString().split('T')[0];
    const [profileRes, targetsRes, mealsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', conn.daughter_user_id).single(),
      supabase.from('daily_targets').select('*').eq('user_id', conn.daughter_user_id).single(),
      supabase.from('meal_logs').select('*').eq('user_id', conn.daughter_user_id).eq('log_date', today).order('created_at'),
    ]);

    if (profileRes.data) setConnectedProfile(profileRes.data);
    if (targetsRes.data) {
      setTargets({
        starches: targetsRes.data.starches, fruits: targetsRes.data.fruits,
        vegetables: targetsRes.data.vegetables, proteins: targetsRes.data.proteins,
        dairy: targetsRes.data.dairy, fats: targetsRes.data.fats,
      });
    }
    if (mealsRes.data) {
      setMeals(mealsRes.data);
      const totals = { ...EMPTY_EXCHANGES };
      for (const m of mealsRes.data) {
        for (const cat of EXCHANGE_CATEGORIES) {
          totals[cat] += Number(m[`total_${cat}`]) || 0;
        }
      }
      setTodayTotals(totals);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!connection || activeTab !== 'history') return;
    const fetchWeek = async () => {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + weekOffset * 7);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const { data } = await supabase.from('meal_logs').select('*')
        .eq('user_id', connection.daughter_user_id)
        .gte('log_date', startOfWeek.toISOString().split('T')[0])
        .lte('log_date', endOfWeek.toISOString().split('T')[0])
        .order('created_at');

      const grouped: Record<string, any[]> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(d.getDate() + i);
        grouped[d.toISOString().split('T')[0]] = [];
      }
      for (const meal of data || []) {
        if (grouped[meal.log_date]) grouped[meal.log_date].push(meal);
      }
      setWeekData(grouped);
    };
    fetchWeek();
  }, [connection, weekOffset, activeTab]);

  const sendMessage = async () => {
    if (!user || !connection || !messageText.trim()) return;
    const { error } = await supabase.from('encouragement_messages').insert({
      from_user_id: user.id,
      to_user_id: connection.daughter_user_id,
      message: messageText.trim(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Message sent! 💜');
    setMessageText('');
    setShowComposer(false);
  };

  if (!connection) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground text-center mb-4">
          No connection found. Ask the person you're supporting to generate a PIN in their Settings and share it with you.
        </p>
        <div className="flex gap-2">
          {hasTrackerRole && (
            <Button onClick={() => setActiveView('tracker')} variant="outline" className="rounded-xl">
              Switch to Tracker 🏠
            </Button>
          )}
          <Button onClick={signOut} variant="outline" className="rounded-xl">Sign Out</Button>
        </div>
      </div>
    );
  }

  const connectedName = connectedProfile?.display_name || 'your person';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky role switcher — always visible when user has both roles */}
      {hasTrackerRole && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-5 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            💜 Supporter view
          </span>
          <button
            onClick={() => setActiveView('tracker')}
            className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
          >
            🏠 Switch to my tracker →
          </button>
        </div>
      )}

      <div className="px-5 pt-6 pb-2">
        <p className="text-sm text-muted-foreground">{today}</p>
        <h1 className="text-lg font-bold">Viewing {connectedName}'s day 💜</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-4">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === 'today' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >Today</button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold ${activeTab === 'history' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
        >History</button>
      </div>

      {activeTab === 'today' && (
        <>
          <div className="px-5 mb-3">
            {(() => {
              const completed = EXCHANGE_CATEGORIES.filter(c => targets[c] > 0 && todayTotals[c] >= targets[c]).length;
              const overall = targets.starches > 0
                ? EXCHANGE_CATEGORIES.reduce((s, c) => s + Math.min(todayTotals[c] / targets[c], 1), 0) / 6
                : 0;
              const pct = Math.round(overall * 100);
              return (
                <div className="bg-card border rounded-2xl p-3 flex items-center gap-3">
                  <div className="text-3xl">{completed === 6 ? '🌟' : completed >= 3 ? '💪' : '🌱'}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold">{completed} of 6 goals hit</span>
                      <span className="text-xs text-muted-foreground">{pct}% of day</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

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

          <div className="px-5 space-y-3">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Meals Today</h2>
            {meals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No meals logged yet today</p>
            )}
            {meals.map(meal => (
              <div key={meal.id} className="bg-card border rounded-2xl p-4">
                <div className="font-bold text-sm mb-1">{meal.meal_label}</div>
                <div className="text-xs text-muted-foreground">
                  {((meal.food_items as MealFoodEntry[]) || []).map((f, i) => (
                    <span key={i}>{i > 0 ? ', ' : ''}{f.foodName}</span>
                  ))}
                </div>
                <div className="flex gap-1 mt-2">
                  {EXCHANGE_CATEGORIES.filter(c => Number(meal[`total_${c}`]) > 0).map(c => (
                    <span key={c} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                      {meal[`total_${c}`]} {CATEGORY_META[c].label.toLowerCase()}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'history' && (
        <div className="px-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setWeekOffset(w => w - 1)} className="text-primary font-semibold text-sm">← Prev</button>
            <span className="font-semibold text-sm">Weekly View</span>
            <button onClick={() => setWeekOffset(w => Math.min(w + 1, 0))} disabled={weekOffset >= 0} className="text-primary font-semibold text-sm disabled:opacity-30">Next →</button>
          </div>
          <div className="space-y-2">
            {Object.keys(weekData).sort().map(day => {
              const dayMeals = weekData[day];
              const dateObj = new Date(day + 'T12:00:00');
              const isExpanded = expandedDay === day;
              const dayTotals = { ...EMPTY_EXCHANGES };
              for (const m of dayMeals) {
                for (const cat of EXCHANGE_CATEGORIES) {
                  dayTotals[cat] += Number(m[`total_${cat}`]) || 0;
                }
              }
              return (
                <div key={day} className="bg-card border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                    disabled={dayMeals.length === 0}
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dayMeals.length} meal{dayMeals.length !== 1 ? 's' : ''} logged
                      </p>
                    </div>
                    {dayMeals.length > 0 && (
                      <span className={`text-muted-foreground text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    )}
                  </button>

                  {isExpanded && dayMeals.length > 0 && (
                    <div className="px-3 pb-3 space-y-2 border-t pt-3">
                      {/* Day totals */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {EXCHANGE_CATEGORIES.filter(c => dayTotals[c] > 0).map(c => (
                          <span key={c} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                            {CATEGORY_META[c].emoji} {dayTotals[c]} / {targets[c]}
                          </span>
                        ))}
                      </div>
                      {/* Meals */}
                      {dayMeals.map(meal => (
                        <div key={meal.id} className="bg-muted/40 rounded-lg p-2.5">
                          <div className="font-semibold text-xs mb-1">{meal.meal_label}</div>
                          <div className="text-xs text-muted-foreground mb-1.5">
                            {((meal.food_items as MealFoodEntry[]) || []).map((f, i) => (
                              <span key={i}>{i > 0 ? ', ' : ''}{f.foodName}</span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {EXCHANGE_CATEGORIES.filter(c => Number(meal[`total_${c}`]) > 0).map(c => (
                              <span key={c} className="text-[10px] bg-background px-1.5 py-0.5 rounded-full">
                                {meal[`total_${c}`]} {CATEGORY_META[c].label.toLowerCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Encouragement button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
        {!showComposer ? (
          <div className="flex gap-2">
            <Button onClick={() => setShowComposer(true)} className="flex-1 rounded-2xl h-12 font-bold">
              Send Encouragement 💜
            </Button>
            <Button onClick={signOut} variant="outline" className="rounded-2xl h-12">
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-4 shadow-lg">
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_MESSAGES.map(msg => (
                <button
                  key={msg}
                  onClick={() => setMessageText(msg)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${messageText === msg ? 'bg-secondary text-secondary-foreground' : 'bg-muted'}`}
                >
                  {msg}
                </button>
              ))}
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value.slice(0, 150))}
              placeholder="Or type your own message..."
              className="w-full border rounded-xl p-3 text-sm resize-none h-16 bg-background"
            />
            <div className="flex gap-2 mt-2">
              <Button onClick={sendMessage} disabled={!messageText.trim()} className="flex-1 rounded-xl">Send 💜</Button>
              <Button onClick={() => setShowComposer(false)} variant="outline" className="rounded-xl">Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
