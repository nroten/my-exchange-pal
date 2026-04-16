import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { EXCHANGE_CATEGORIES, CATEGORY_META, ExchangeValues } from '@/types/nutrition';
import { toast } from 'sonner';

const DEFAULT_TARGETS: ExchangeValues = {
  starches: 6, fruits: 3, vegetables: 5, proteins: 6, dairy: 3, fats: 4,
};

export default function Setup() {
  const { user, refreshProfile } = useAuth();
  const [targets, setTargets] = useState<ExchangeValues>({ ...DEFAULT_TARGETS });
  const [loading, setLoading] = useState(false);

  const updateTarget = (cat: keyof ExchangeValues, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setTargets(prev => ({ ...prev, [cat]: num }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('daily_targets').upsert({
        user_id: user.id,
        ...targets,
      }, { onConflict: 'user_id' });
      if (error) throw error;

      await supabase.from('profiles').update({ setup_complete: true }).eq('user_id', user.id);
      await refreshProfile();
      toast.success("You're all set! Let's start tracking! 🎉");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-6">
      <div className="w-full max-w-sm mt-8">
        <h1 className="text-2xl font-bold text-center mb-2">Set Your Daily Goals 🎯</h1>
        <p className="text-center text-muted-foreground text-sm mb-8">
          Enter the daily exchange targets from your dietitian. You can always change these later!
        </p>

        <div className="space-y-4">
          {EXCHANGE_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <div
                key={cat}
                className="flex items-center justify-between bg-card rounded-2xl p-4 shadow-sm border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{meta.emoji}</span>
                  <span className="font-semibold">{meta.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateTarget(cat, String(Math.max(0, targets[cat] - 1)))}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-lg"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{targets[cat]}</span>
                  <button
                    onClick={() => updateTarget(cat, String(targets[cat] + 1))}
                    className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-lg"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full h-12 rounded-xl text-base font-semibold mt-8"
        >
          {loading ? 'Saving...' : "Let's Go! 🚀"}
        </Button>
      </div>
    </div>
  );
}
