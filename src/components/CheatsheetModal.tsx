import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ─── DATA ────────────────────────────────────────────────────────────────────

const EXCHANGE_KEY = [
  {
    type: 'Lean Protein',
    token: 'macro-protein',
    icon: '🥩',
    macros: '7g protein · 0–3g fat · ~55 cal',
    oneExchange: '1 oz cooked meat or fish',
    examples: ['1 oz chicken breast', '1 oz tuna/tilapia', '2 egg whites', '¼ cup cottage cheese', '1 oz turkey breast'],
  },
  {
    type: 'Medium-Fat Protein',
    token: 'macro-calories',
    icon: '🍳',
    macros: '7g protein · 5g fat · ~75 cal',
    oneExchange: '1 oz cooked meat or 1 egg',
    examples: ['1 oz salmon', '1 oz chicken thigh', '1 whole egg', '1 oz mozzarella', '1 oz ground beef 90/10'],
  },
  {
    type: 'High-Fat Protein',
    token: 'destructive',
    icon: '🥓',
    macros: '7g protein · 8g fat · ~100 cal',
    oneExchange: '1 oz fatty meat or hard cheese',
    examples: ['1 oz ribeye', '2 strips bacon', '1 oz cheddar/colby jack', '1 oz ground beef 80/20', '1 oz sausage'],
  },
  {
    type: 'Starch',
    token: 'macro-carbs',
    icon: '🍚',
    macros: '15g carbs · 3g protein · ~80 cal',
    oneExchange: '⅓ cup cooked grains / ½ cup potato',
    examples: ['⅓ cup rice or pasta', '¼ cup dry oats', '½ cup potato/sweet potato', '1 slice Ezekiel bread', '½ cup beans or lentils'],
  },
  {
    type: 'Fruit',
    token: 'macro-protein',
    icon: '🍎',
    macros: '15g carbs · ~60 cal',
    oneExchange: '1 small fruit or ¾ cup berries',
    examples: ['1 small apple or orange', '½ medium banana', '¾ cup blueberries', '1¼ cup strawberries', '17 grapes'],
  },
  {
    type: 'Vegetable',
    token: 'macro-primary',
    icon: '🥦',
    macros: '5g carbs · 2g protein · ~25 cal',
    oneExchange: '½ cup cooked or 1 cup raw',
    examples: ['1 cup broccoli/cauliflower', '1 cup spinach or greens', '½ cup bell peppers', '½ cup onion', '6 asparagus spears'],
  },
  {
    type: 'Fat',
    token: 'macro-fats',
    icon: '🥑',
    macros: '5g fat · ~45 cal',
    oneExchange: '1 tsp oil / 6 nuts / ⅛ avocado',
    examples: ['1 tsp olive oil or butter', '1 tbsp nut butter', '6 mixed nuts', '⅛ avocado', '1 tbsp seeds'],
  },
  {
    type: 'Low-Fat Milk',
    token: 'macro-primary',
    icon: '🥛',
    macros: '12g carbs · 8g protein · 3g fat · ~100 cal',
    oneExchange: '1 cup low-fat milk or Greek yogurt',
    examples: ['1 cup Greek yogurt', '1 cup low-fat milk', '¾ cup plain kefir'],
  },
  {
    type: 'Whole Milk',
    token: 'secondary',
    icon: '🍼',
    macros: '12g carbs · 8g protein · 8g fat · ~150 cal',
    oneExchange: '1 cup whole milk',
    examples: ['1 cup whole milk', '1 cup full-fat kefir'],
  },
];

const QUICK_TIPS = [
  { icon: '🍗', tip: 'Aim for a palm-sized protein at every meal' },
  { icon: '🥦', tip: 'Non-starchy veggies are nearly free — pile them on' },
  { icon: '⚖️', tip: 'Weigh proteins raw, grains & pasta dry for accuracy' },
  { icon: '🎯', tip: 'Protein ±5g · Carbs ±5g · Fat ±3g · Cals ±50' },
  { icon: '🧩', tip: 'Play Food Tetris — adjust serving sizes before swapping foods' },
  { icon: '📋', tip: 'Pre-track your meals before you eat them' },
];

const TARGET_TOLERANCES = [
  { label: 'Protein', tolerance: '± 5g', token: 'macro-protein', icon: '🥩' },
  { label: 'Carbs', tolerance: '± 5g', token: 'macro-carbs', icon: '🍚' },
  { label: 'Fat', tolerance: '± 3g', token: 'macro-fats', icon: '🥑' },
  { label: 'Calories', tolerance: '± 50 kcal', token: 'macro-calories', icon: '🔥' },
];

type TabId = 'exchanges' | 'tips' | 'targets';
export type CheatsheetMode = 'macros' | 'exchanges';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: CheatsheetMode;
}

export default function CheatsheetModal({ open, onOpenChange, mode = 'macros' }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('exchanges');
  const [expanded, setExpanded] = useState<number | null>(null);
  const showExchanges = mode === 'exchanges';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'exchanges', label: 'Exchange Types' },
    { id: 'tips', label: 'Quick Tips' },
    { id: 'targets', label: 'Macro Targets' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 bg-macro-surface border-macro-border text-macro-text">
        {/* Header */}
        <div className="px-6 pt-5 pb-0 border-b border-macro-border bg-macro-bg/40 rounded-t-lg">
          <DialogHeader className="mb-3">
            <DialogTitle className="text-macro-text flex items-center gap-2 text-lg">
              <span>📋</span> Macro Cheatsheet
            </DialogTitle>
            <p className="text-[11px] uppercase tracking-wider text-macro-muted ml-7">
              Quick reference before logging
            </p>
          </DialogHeader>

          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-t-lg text-xs font-bold tracking-wide transition ${
                  activeTab === t.id
                    ? 'bg-macro-primary text-macro-primary-foreground'
                    : 'text-macro-muted hover:text-macro-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {activeTab === 'exchanges' && (
            <div>
              <p className="text-xs text-macro-muted mb-4">Tap any exchange type to see portion examples.</p>
              <div className="space-y-2">
                {EXCHANGE_KEY.map((ex, i) => {
                  const isOpen = expanded === i;
                  return (
                    <div
                      key={ex.type}
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className={`bg-macro-bg border border-macro-border rounded-xl p-3 cursor-pointer transition hover:border-${ex.token}/60`}
                      style={{ borderLeft: `4px solid hsl(var(--${ex.token}))` }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{ex.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-extrabold" style={{ color: `hsl(var(--${ex.token}))` }}>
                              {ex.type}
                            </span>
                            {isOpen ? (
                              <ChevronUp size={14} className="text-macro-muted" />
                            ) : (
                              <ChevronDown size={14} className="text-macro-muted" />
                            )}
                          </div>
                          <div className="text-[11px] text-macro-muted mt-0.5">{ex.macros}</div>
                          <div className="inline-block mt-1.5 text-[11px] font-semibold text-macro-text bg-macro-surface-2 px-2 py-0.5 rounded">
                            1 exchange = {ex.oneExchange}
                          </div>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-macro-border">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-macro-muted mb-2">
                            Examples of 1 Exchange:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {ex.examples.map((eg) => (
                              <span
                                key={eg}
                                className="text-[11px] px-2.5 py-1 rounded-full font-semibold border"
                                style={{
                                  background: `hsl(var(--${ex.token}) / 0.12)`,
                                  color: `hsl(var(--${ex.token}))`,
                                  borderColor: `hsl(var(--${ex.token}) / 0.3)`,
                                }}
                              >
                                {eg}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div>
              <p className="text-xs text-macro-muted mb-4">Keep these in mind every time you log a meal.</p>
              <div className="space-y-2.5">
                {QUICK_TIPS.map((t, i) => (
                  <div
                    key={i}
                    className="bg-macro-bg border border-macro-border rounded-xl px-4 py-3 flex items-center gap-3"
                  >
                    <span className="text-2xl shrink-0">{t.icon}</span>
                    <span className="text-sm text-macro-text font-medium leading-snug">{t.tip}</span>
                  </div>
                ))}

                <div className="mt-2 rounded-xl px-4 py-4 border border-macro-primary/40 bg-gradient-to-br from-macro-primary/15 to-macro-calories/10">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-macro-primary mb-1.5">
                    🎯 Hitting Your Macros
                  </div>
                  <div className="text-xs text-macro-muted leading-relaxed">
                    Step 1 — Enter your planned foods<br />
                    Step 2 — Check your totals vs targets<br />
                    Step 3 — Adjust serving sizes first<br />
                    Step 4 — Swap foods only if needed
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'targets' && (
            <div>
              <p className="text-xs text-macro-muted mb-4">
                Standard daily targets. Your coach may adjust these based on your goals.
              </p>

              <div className="mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-macro-muted mb-2">
                  Daily Tolerance Windows
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_TOLERANCES.map(({ label, tolerance, token, icon }) => (
                    <div
                      key={label}
                      className="bg-macro-bg border rounded-xl px-4 py-3 flex items-center gap-3"
                      style={{ borderColor: `hsl(var(--${token}) / 0.3)` }}
                    >
                      <span className="text-2xl">{icon}</span>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-macro-muted">
                          {label}
                        </div>
                        <div className="text-base font-extrabold" style={{ color: `hsl(var(--${token}))` }}>
                          {tolerance}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="bg-macro-bg border border-macro-protein/40 rounded-xl px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-macro-protein mb-2">
                    🥩 Protein Target Rule
                  </div>
                  <div className="text-sm text-macro-muted leading-relaxed">
                    <strong className="text-macro-text">~1g per lb of ideal bodyweight</strong>
                    <br />
                    <span className="text-[11px]">e.g. Goal weight 180 lbs → ~180g protein/day</span>
                  </div>
                </div>

                <div className="bg-macro-bg border border-macro-primary/40 rounded-xl px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-macro-primary mb-2">
                    🔥 Calorie Target Rule
                  </div>
                  <div className="text-sm text-macro-muted leading-relaxed">
                    <strong className="text-macro-text">10–12× your ideal bodyweight</strong>
                    <br />
                    <span className="text-[11px]">e.g. Goal weight 180 lbs → 1,800–2,160 cal/day</span>
                  </div>
                </div>

                <div className="bg-macro-bg border border-macro-carbs/40 rounded-xl px-4 py-4">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-macro-carbs mb-2">
                    💧 Hydration Target
                  </div>
                  <div className="text-sm text-macro-muted leading-relaxed">
                    <strong className="text-macro-text">½ your bodyweight in oz + 10–15 oz</strong>
                    <br />
                    <span className="text-[11px]">e.g. 180 lbs → 90 + 15 = ~105 oz/day</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-macro-border bg-macro-bg/60 flex items-center justify-between rounded-b-lg">
          <span className="text-[10px] tracking-wide text-macro-muted">ADA Standard Exchange System</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
