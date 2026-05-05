import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeValues, ExchangeCategory } from '@/types/nutrition';
import { toast } from 'sonner';

export default function Settings() {
  const { user, profile, signOut, refreshProfile, hasSupporterRole, refreshRoles } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [targets, setTargets] = useState<ExchangeValues>({
    starches: 6, fruits: 3, vegetables: 5, proteins: 6, dairy: 3, fats: 4,
  });
  const [macroTargets, setMacroTargets] = useState({ calories: 2000, protein: 100, carbs: 220, fats: 70 });
  const [trackingMode, setTrackingMode] = useState<'exchanges' | 'macros'>(
    (profile?.tracking_mode as 'exchanges' | 'macros') || 'exchanges'
  );
  const [connections, setConnections] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [connectPin, setConnectPin] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showAddSupporter, setShowAddSupporter] = useState(false);
  const [savedMeals, setSavedMeals] = useState<any[]>([]);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [editingRecipeName, setEditingRecipeName] = useState('');

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [t, c, sm, mt] = await Promise.all([
        supabase.from('daily_targets').select('*').eq('user_id', user.id).single(),
        supabase.from('parent_connections').select('*').eq('daughter_user_id', user.id),
        supabase.from('saved_meals').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('macro_targets').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      if (t.data) {
        setTargets({
          starches: t.data.starches, fruits: t.data.fruits,
          vegetables: t.data.vegetables, proteins: t.data.proteins,
          dairy: t.data.dairy, fats: t.data.fats,
        });
      }
      if (c.data) setConnections(c.data);
      if (sm.data) setSavedMeals(sm.data);
      if (mt.data) {
        setMacroTargets({
          calories: Number(mt.data.calories), protein: Number(mt.data.protein),
          carbs: Number(mt.data.carbs), fats: Number(mt.data.fats),
        });
      }
    };
    fetch();
  }, [user]);

  const updateTrackingMode = async (mode: 'exchanges' | 'macros') => {
    if (!user) return;
    setTrackingMode(mode);
    const { error } = await supabase.from('profiles').update({ tracking_mode: mode }).eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success(`Switched to ${mode === 'macros' ? 'Macros' : 'Exchanges'} mode`);
  };

  const saveMacroTargets = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('macro_targets')
      .upsert({ user_id: user.id, ...macroTargets }, { onConflict: 'user_id' });
    if (error) { toast.error(error.message); return; }
    toast.success('Macro targets updated! 🎯');
  };

  const refreshSavedMeals = async () => {
    if (!user) return;
    const { data } = await supabase.from('saved_meals').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (data) setSavedMeals(data);
  };

  const deleteRecipe = async (id: string) => {
    const { error } = await supabase.from('saved_meals').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Recipe deleted');
    refreshSavedMeals();
  };

  const renameRecipe = async (id: string) => {
    if (!editingRecipeName.trim()) return;
    const { error } = await supabase.from('saved_meals').update({ name: editingRecipeName.trim() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Recipe renamed');
    setEditingRecipeId(null);
    setEditingRecipeName('');
    refreshSavedMeals();
  };

  const saveTargets = async () => {
    if (!user) return;
    const { error } = await supabase.from('daily_targets').update(targets).eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Targets updated! 🎯');
  };

  const saveName = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    toast.success('Name updated!');
  };

  const generatePin = async () => {
    if (!user) return;
    const newPin = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabase.from('parent_connections').insert({
      daughter_user_id: user.id,
      pin_code: newPin,
    });
    if (error) { toast.error(error.message); return; }
    setPin(newPin);
    toast.success('PIN generated! Share it with your supporter.');
    const { data } = await supabase.from('parent_connections').select('*').eq('daughter_user_id', user.id);
    if (data) setConnections(data);
  };

  const revokeConnection = async (id: string) => {
    await supabase.from('parent_connections').update({ status: 'revoked' }).eq('id', id);
    toast.success('Access revoked');
    const { data } = await supabase.from('parent_connections').select('*').eq('daughter_user_id', user.id);
    if (data) setConnections(data);
  };

  const connectAsSupporter = async () => {
    if (!user || !connectPin.trim()) return;
    const { data: conn } = await supabase
      .from('parent_connections')
      .select('*')
      .eq('pin_code', connectPin.trim())
      .eq('status', 'pending')
      .single();

    if (!conn) {
      toast.error('PIN not found or already used');
      return;
    }

    if (conn.daughter_user_id === user.id) {
      toast.error("You can't connect to yourself!");
      return;
    }

    const { error } = await supabase.from('parent_connections').update({
      parent_user_id: user.id,
      status: 'active',
    }).eq('id', conn.id);

    if (error) { toast.error(error.message); return; }
    toast.success('Connected! You can now view their progress 🧡');
    setConnectPin('');
    setShowAddSupporter(false);
    await refreshRoles();
  };

  const GUIDE_DATA: Record<ExchangeCategory, { desc: string; examples: string[] }> = {
    starches:   { desc: 'Breads, cereals, grains, pasta, starchy veggies', examples: ['1 slice bread', '½ cup pasta', '½ cup oatmeal', '1 small potato'] },
    fruits:     { desc: 'Fresh, frozen, canned fruit or 100% juice', examples: ['1 small apple', '1 cup berries', '½ cup juice', '1 banana'] },
    vegetables: { desc: 'Non-starchy vegetables, raw or cooked', examples: ['1 cup raw broccoli', '½ cup cooked carrots', '1 cup salad', '½ cup green beans'] },
    proteins:   { desc: 'Meat, poultry, fish, eggs, beans, tofu', examples: ['1 oz chicken', '1 egg', '2 tbsp peanut butter', '¼ cup cottage cheese'] },
    dairy:      { desc: 'Milk and milk products', examples: ['1 cup milk', '1 oz cheese', '6 oz yogurt', '1 cup soy milk'] },
    fats:       { desc: 'Oils, nuts, avocado, dressings', examples: ['1 tsp oil', '¼ avocado', '1 tbsp dressing', '4 walnut halves'] },
  };

  return (
    <div className="min-h-screen bg-background p-5 pb-24">
      <h1 className="text-xl font-bold mb-6">Settings ⚙️</h1>

      {/* Display name */}
      <section className="mb-6">
        <h2 className="font-semibold text-sm mb-2">Display Name</h2>
        <div className="flex gap-2">
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl" />
          <Button onClick={saveName} variant="outline" className="rounded-xl">Save</Button>
        </div>
      </section>

      {/* Tracking mode */}
      <section className="mb-6">
        <h2 className="font-semibold text-sm mb-2">Tracking Mode</h2>
        <p className="text-xs text-muted-foreground mb-2">
          Choose how you want to log food. You can switch anytime.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateTrackingMode('exchanges')}
            className={`rounded-xl p-3 text-left border transition ${
              trackingMode === 'exchanges'
                ? 'bg-primary/10 border-primary'
                : 'bg-card border-border'
            }`}
          >
            <div className="font-bold text-sm">🥗 Exchanges</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Track food groups by servings.</div>
          </button>
          <button
            onClick={() => updateTrackingMode('macros')}
            className={`rounded-xl p-3 text-left border transition ${
              trackingMode === 'macros'
                ? 'bg-primary/10 border-primary'
                : 'bg-card border-border'
            }`}
          >
            <div className="font-bold text-sm">💪 Macros</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Tap meal tiles to log calories + P/C/F.</div>
          </button>
        </div>
      </section>

      {/* Macro targets */}
      {trackingMode === 'macros' && (
        <section className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Daily Macro Targets</h2>
          <div className="space-y-2">
            {([
              { key: 'calories', label: 'Calories', emoji: '🔥', step: 50 },
              { key: 'protein', label: 'Protein (g)', emoji: '🍗', step: 5 },
              { key: 'carbs', label: 'Carbs (g)', emoji: '🍞', step: 5 },
              { key: 'fats', label: 'Fats (g)', emoji: '🥑', step: 5 },
            ] as const).map(row => (
              <div key={row.key} className="flex items-center justify-between bg-card border rounded-xl p-3">
                <span className="text-sm">{row.emoji} {row.label}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMacroTargets(prev => ({ ...prev, [row.key]: Math.max(0, prev[row.key] - row.step) }))}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold"
                  >−</button>
                  <Input
                    type="number"
                    value={macroTargets[row.key]}
                    onChange={(e) => setMacroTargets(prev => ({ ...prev, [row.key]: Number(e.target.value) || 0 }))}
                    className="w-20 text-center rounded-lg h-8"
                  />
                  <button
                    onClick={() => setMacroTargets(prev => ({ ...prev, [row.key]: prev[row.key] + row.step }))}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold"
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          <Button onClick={saveMacroTargets} className="w-full rounded-xl mt-3">Save Macro Targets</Button>
        </section>
      )}

      {/* Daily targets */}
      <section className="mb-6">
        <h2 className="font-semibold text-sm mb-2">Daily Exchange Targets</h2>
        <div className="space-y-2">
          {EXCHANGE_CATEGORIES.map(cat => (
            <div key={cat} className="flex items-center justify-between bg-card border rounded-xl p-3">
              <span className="text-sm">{CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTargets(prev => ({ ...prev, [cat]: Math.max(0, prev[cat] - 1) }))}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold"
                >−</button>
                <span className="w-6 text-center font-bold">{targets[cat]}</span>
                <button
                  onClick={() => setTargets(prev => ({ ...prev, [cat]: prev[cat] + 1 }))}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-bold"
                >+</button>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={saveTargets} className="w-full rounded-xl mt-3">Save Targets</Button>
      </section>

      {/* My Recipes */}
      <section className="mb-6">
        <h2 className="font-semibold text-sm mb-2">My Recipes 🧡</h2>
        <p className="text-xs text-muted-foreground mb-2">
          Saved meals you can re-log with one tap from the meal logger.
        </p>
        {savedMeals.length === 0 ? (
          <div className="bg-card border rounded-xl p-4 text-center text-sm text-muted-foreground">
            <div className="text-2xl mb-1">🍽️</div>
            No recipes saved yet. When logging a meal, tap "Save as recipe" to create one.
          </div>
        ) : (
          <div className="space-y-2">
            {savedMeals.map(sm => (
              <div key={sm.id} className="bg-card border rounded-xl p-3">
                {editingRecipeId === sm.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editingRecipeName}
                      onChange={(e) => setEditingRecipeName(e.target.value)}
                      className="rounded-lg text-sm flex-1"
                      autoFocus
                    />
                    <Button onClick={() => renameRecipe(sm.id)} size="sm" className="rounded-lg">Save</Button>
                    <Button onClick={() => setEditingRecipeId(null)} variant="outline" size="sm" className="rounded-lg">×</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{sm.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {(sm.food_items as any[])?.length || 0} items
                        {sm.default_meal_label && ` · ${sm.default_meal_label}`}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingRecipeId(sm.id); setEditingRecipeName(sm.name); }}
                        className="text-xs text-primary font-semibold px-2 py-1"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteRecipe(sm.id)}
                        className="text-xs text-destructive font-semibold px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Supporter connections (invite someone to view your progress) */}
      <section className="mb-6">
        <h2 className="font-semibold text-sm mb-2">My Supporters</h2>
        {connections.filter(c => c.status === 'active').map(c => (
          <div key={c.id} className="flex items-center justify-between bg-card border rounded-xl p-3 mb-2">
            <span className="text-sm">Supporter connected ✅</span>
            <button onClick={() => revokeConnection(c.id)} className="text-xs text-destructive">Revoke</button>
          </div>
        ))}
        {pin && (
          <div className="bg-secondary/20 border border-secondary/30 rounded-xl p-4 text-center mb-3">
            <p className="text-sm text-muted-foreground mb-1">Share this PIN with your supporter</p>
            <p className="text-3xl font-bold tracking-widest text-secondary">{pin}</p>
          </div>
        )}
        <Button onClick={generatePin} variant="outline" className="w-full rounded-xl">
          Invite a Supporter 🔗
        </Button>
      </section>

      {/* Become a supporter (connect to someone else) */}
      {!hasSupporterRole && (
        <section className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Support Someone</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Want to follow someone else's progress and send them encouragement? Enter their PIN to connect.
          </p>
          {showAddSupporter ? (
            <div className="bg-card border rounded-xl p-4 space-y-3">
              <Input
                placeholder="Enter 6-digit PIN"
                value={connectPin}
                onChange={(e) => setConnectPin(e.target.value)}
                className="rounded-xl text-center text-lg tracking-widest"
                maxLength={6}
              />
              <div className="flex gap-2">
                <Button onClick={connectAsSupporter} disabled={connectPin.length < 6} className="flex-1 rounded-xl">
                  Connect 🧡
                </Button>
                <Button onClick={() => setShowAddSupporter(false)} variant="outline" className="rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAddSupporter(true)} variant="outline" className="w-full rounded-xl">
              Become a Supporter 🧡
            </Button>
          )}
        </section>
      )}

      {hasSupporterRole && (
        <section className="mb-6">
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-3">
            <p className="text-sm font-medium text-secondary">🧡 You're a supporter!</p>
            <p className="text-xs text-muted-foreground mt-1">Switch to supporter view from the bottom navigation.</p>
          </div>
        </section>
      )}

      {/* Exchange guide */}
      <section className="mb-6">
        <button onClick={() => setShowGuide(!showGuide)} className="text-sm text-primary font-semibold underline">
          {showGuide ? 'Hide' : 'Show'} Exchange Guide 📖
        </button>
        {showGuide && (
          <div className="mt-3 space-y-3">
            {EXCHANGE_CATEGORIES.map(cat => (
              <div key={cat} className="bg-card border rounded-xl p-3">
                <div className="font-semibold text-sm mb-1">{CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}</div>
                <p className="text-xs text-muted-foreground mb-2">{GUIDE_DATA[cat].desc}</p>
                <div className="text-xs text-muted-foreground">
                  {GUIDE_DATA[cat].examples.map((ex, i) => (
                    <span key={i}>{i > 0 ? ' · ' : ''}{ex}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sign out */}
      <Button onClick={signOut} variant="outline" className="w-full rounded-xl">
        Sign Out
      </Button>
    </div>
  );
}
