import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const GOAL_MULTIPLIERS = {
  loss:     { label: 'Fat Loss',    min: 10, max: 11, proteinMult: 1.0,  fatPct: 0.25, icon: '🔥' },
  maintain: { label: 'Maintenance', min: 12, max: 13, proteinMult: 0.85, fatPct: 0.30, icon: '⚖️' },
  gain:     { label: 'Muscle Gain', min: 14, max: 15, proteinMult: 1.0,  fatPct: 0.25, icon: '💪' },
} as const;

const ACTIVITY_FACTORS = {
  sedentary: { label: 'Sedentary',         sub: 'Desk job, little exercise',   factor: 1.0 },
  light:     { label: 'Lightly Active',    sub: '1–3 days/week training',      factor: 1.1 },
  moderate:  { label: 'Moderately Active', sub: '3–5 days/week training',      factor: 1.2 },
  very:      { label: 'Very Active',       sub: '6–7 days/week hard training', factor: 1.3 },
} as const;

type GoalKey = keyof typeof GOAL_MULTIPLIERS;
type ActivityKey = keyof typeof ACTIVITY_FACTORS;

export interface CalcResult {
  calMin: number; calMax: number; calTarget: number;
  protein: number; carbs: number; fat: number;
  hydration: number;
  proteinEx: number; starchEx: number; fruitEx: number; vegEx: number; fatEx: number; dairyEx: number;
}

function calcTargets(goalWeight: number, goal: GoalKey, activity: ActivityKey): CalcResult | null {
  if (!goalWeight || goalWeight < 80 || goalWeight > 400) return null;
  const g = GOAL_MULTIPLIERS[goal];
  const af = ACTIVITY_FACTORS[activity].factor;

  const calMin = Math.round((goalWeight * g.min * af) / 50) * 50;
  const calMax = Math.round((goalWeight * g.max * af) / 50) * 50;
  const calTarget = Math.round((calMin + calMax) / 2 / 50) * 50;

  const protein = Math.round(goalWeight * g.proteinMult);
  const fat = Math.round((calTarget * g.fatPct) / 9);
  const carbs = Math.max(0, Math.round((calTarget - protein * 4 - fat * 9) / 4));
  const hydration = Math.round(goalWeight * 0.5 + 12);

  // Exchange budget — rounded to nearest whole exchange
  const round = (n: number) => Math.max(0, Math.round(n));
  const dairyEx = 2; // standard dairy allowance, dairy carbs subtracted from carb pool
  const dairyCarbs = dairyEx * 12;
  const remainingCarbs = Math.max(0, carbs - dairyCarbs);
  const starchEx = round((remainingCarbs * 0.7) / 15);
  const fruitEx = round((remainingCarbs * 0.2) / 15);
  const vegEx = round((remainingCarbs * 0.1) / 5);
  const proteinEx = round((protein - dairyEx * 8) / 7);
  const fatEx = round((fat - dairyEx * 3) / 5);

  return { calMin, calMax, calTarget, protein, carbs, fat, hydration, proteinEx, starchEx, fruitEx, vegEx, fatEx, dairyEx };
}

interface Props {
  mode?: 'macros' | 'exchanges';
  onApply?: (targets: { calories: number; protein: number; carbs: number; fats: number }) => void;
  onApplyExchanges?: (targets: { starches: number; fruits: number; vegetables: number; proteins: number; dairy: number; fats: number }) => void;
}

export default function MacroCalculator({ mode = 'macros', onApply, onApplyExchanges }: Props) {
  const [goalWeight, setGoalWeight] = useState('');
  const [goal, setGoal] = useState<GoalKey>('maintain');
  const [activity, setActivity] = useState<ActivityKey>('moderate');
  const [calculated, setCalculated] = useState(false);

  const wNum = Number(goalWeight);
  const valid = wNum >= 80 && wNum <= 400;
  const t = calculated && valid ? calcTargets(wNum, goal, activity) : null;
  const goalData = GOAL_MULTIPLIERS[goal];
  const showMacros = mode === 'macros';
  const showExchanges = mode === 'exchanges';

  const reset = () => { setCalculated(false); setGoalWeight(''); };

  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Enter your <strong className="text-foreground">goal weight</strong> and we'll estimate your daily {showExchanges ? 'exchange budget' : 'calorie & macro targets'}.
      </p>

      {/* Goal weight */}
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          Goal Weight (lbs)
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={goalWeight}
            onChange={(e) => { setGoalWeight(e.target.value); setCalculated(false); }}
            placeholder="e.g. 165"
            min={80}
            max={400}
            className="w-28 text-center font-bold rounded-lg"
          />
          <span className="text-xs text-muted-foreground">lbs</span>
          {goalWeight && wNum < 80 && (
            <span className="text-[10px] text-destructive">⚠️ Enter at least 80 lbs</span>
          )}
        </div>
      </div>

      {/* Goal */}
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Goal</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(GOAL_MULTIPLIERS) as [GoalKey, typeof GOAL_MULTIPLIERS[GoalKey]][]).map(([key, g]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setGoal(key); setCalculated(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                goal === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {g.icon} {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="mb-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Activity Level</div>
        <div className="flex flex-col gap-1.5">
          {(Object.entries(ACTIVITY_FACTORS) as [ActivityKey, typeof ACTIVITY_FACTORS[ActivityKey]][]).map(([key, a]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setActivity(key); setCalculated(false); }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition ${
                activity === key
                  ? 'bg-primary/10 border-primary text-foreground font-bold'
                  : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/40'
              }`}
            >
              <span>{a.label}</span>
              <span className="text-[10px] opacity-70 font-normal">{a.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={() => valid && setCalculated(true)}
        disabled={!valid}
        className="w-full rounded-xl"
      >
        {calculated ? 'Recalculate →' : 'Calculate My Targets →'}
      </Button>

      {/* Results */}
      {t && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-3 py-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {goalData.icon} {goalData.label} · {goalWeight} lbs
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {ACTIVITY_FACTORS[activity].label}
              </div>
            </div>
            <button onClick={reset} className="text-[10px] text-muted-foreground underline">
              Reset
            </button>
          </div>

          {/* Calorie range */}
          {showMacros && (
            <div className="bg-background border rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    🔥 Daily Calories
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-0.5">
                    {t.calMin.toLocaleString()}–{t.calMax.toLocaleString()}
                    <span className="text-[11px] text-muted-foreground font-normal"> kcal</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">target</div>
                  <div className="text-base font-extrabold text-primary">
                    {t.calTarget.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Macro grid */}
          {showMacros && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Protein', value: t.protein, icon: '🥩', cal: t.protein * 4 },
                { label: 'Carbs',   value: t.carbs,   icon: '🍞', cal: t.carbs * 4 },
                { label: 'Fat',     value: t.fat,     icon: '🥑', cal: t.fat * 9 },
              ].map(({ label, value, icon, cal }) => {
                const pct = Math.round((cal / t.calTarget) * 100);
                return (
                  <div key={label} className="bg-background border rounded-xl p-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {icon} {label}
                    </div>
                    <div className="text-lg font-extrabold text-foreground">
                      {value}<span className="text-[10px] text-muted-foreground font-normal">g</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{pct}% · {cal} cal</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Exchange budget */}
          {showExchanges && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                🔄 Daily Exchange Budget
              </div>
              {[
                { label: 'Proteins', value: t.proteinEx, icon: '🍗', sub: '~7g protein each' },
                { label: 'Starches', value: t.starchEx,  icon: '🍞', sub: '~15g carbs each' },
                { label: 'Fruits',   value: t.fruitEx,   icon: '🍎', sub: '~15g carbs each' },
                { label: 'Veggies',  value: t.vegEx,     icon: '🥦', sub: '~5g carbs each' },
                { label: 'Dairy',    value: t.dairyEx,   icon: '🥛', sub: '~12g carbs · 8g protein' },
                { label: 'Fats',     value: t.fatEx,     icon: '🥑', sub: '~5g fat each' },
              ].map(({ label, value, icon, sub }) => (
                <div key={label} className="flex items-center justify-between bg-background border rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground">{label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
                    </div>
                  </div>
                  <div className="text-base font-extrabold text-primary bg-primary/10 px-3 py-0.5 rounded-lg min-w-[44px] text-center">
                    {value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hydration */}
          <div className="bg-background border rounded-xl px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              💧 Hydration
            </div>
            <div className="text-base font-extrabold text-foreground">
              {t.hydration} <span className="text-[10px] text-muted-foreground font-normal">oz/day</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round(t.hydration / 8)} cups · {(t.hydration * 29.6 / 1000).toFixed(1)}L
            </div>
          </div>

          {showMacros && onApply && (
            <Button
              onClick={() => onApply({ calories: t.calTarget, protein: t.protein, carbs: t.carbs, fats: t.fat })}
              variant="outline"
              className="w-full rounded-xl"
            >
              Apply to My Macro Targets ✨
            </Button>
          )}

          {showExchanges && onApplyExchanges && (
            <Button
              onClick={() => onApplyExchanges({
                starches: t.starchEx, fruits: t.fruitEx, vegetables: t.vegEx,
                proteins: t.proteinEx, dairy: t.dairyEx, fats: t.fatEx,
              })}
              variant="outline"
              className="w-full rounded-xl"
            >
              Apply to My Exchange Targets ✨
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            ⚠️ Estimated starting targets. Individual needs vary — consult your coach or a registered dietitian for personalized guidance.
          </p>
        </div>
      )}
    </div>
  );
}
