import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeValues, ExchangeCategory } from '@/types/nutrition';
import { toast } from 'sonner';

export default function Settings() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [targets, setTargets] = useState<ExchangeValues>({
    starches: 6, fruits: 3, vegetables: 5, proteins: 6, dairy: 3, fats: 4,
  });
  const [connections, setConnections] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [t, c] = await Promise.all([
        supabase.from('daily_targets').select('*').eq('user_id', user.id).single(),
        supabase.from('parent_connections').select('*').eq('daughter_user_id', user.id),
      ]);
      if (t.data) {
        setTargets({
          starches: t.data.starches, fruits: t.data.fruits,
          vegetables: t.data.vegetables, proteins: t.data.proteins,
          dairy: t.data.dairy, fats: t.data.fats,
        });
      }
      if (c.data) setConnections(c.data);
    };
    fetch();
  }, [user]);

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
    toast.success('PIN generated! Share it with your parent.');
    // Refresh connections
    const { data } = await supabase.from('parent_connections').select('*').eq('daughter_user_id', user.id);
    if (data) setConnections(data);
  };

  const revokeConnection = async (id: string) => {
    await supabase.from('parent_connections').update({ status: 'revoked' }).eq('id', id);
    toast.success('Access revoked');
    const { data } = await supabase.from('parent_connections').select('*').eq('daughter_user_id', user.id);
    if (data) setConnections(data);
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

      {/* Parent connections */}
      {profile?.role === 'daughter' && (
        <section className="mb-6">
          <h2 className="font-semibold text-sm mb-2">Connected Parents</h2>
          {connections.filter(c => c.status === 'active').map(c => (
            <div key={c.id} className="flex items-center justify-between bg-card border rounded-xl p-3 mb-2">
              <span className="text-sm">Parent connected ✅</span>
              <button onClick={() => revokeConnection(c.id)} className="text-xs text-destructive">Revoke</button>
            </div>
          ))}
          {pin && (
            <div className="bg-secondary/20 border border-secondary/30 rounded-xl p-4 text-center mb-3">
              <p className="text-sm text-muted-foreground mb-1">Share this PIN with your parent</p>
              <p className="text-3xl font-bold tracking-widest text-secondary">{pin}</p>
            </div>
          )}
          <Button onClick={generatePin} variant="outline" className="w-full rounded-xl">
            Generate Parent Link 🔗
          </Button>
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
