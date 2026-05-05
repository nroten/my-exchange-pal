-- Profile tracking mode
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tracking_mode text NOT NULL DEFAULT 'exchanges';

-- Macro targets
CREATE TABLE public.macro_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  calories numeric NOT NULL DEFAULT 2000,
  protein numeric NOT NULL DEFAULT 100,
  carbs numeric NOT NULL DEFAULT 220,
  fats numeric NOT NULL DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.macro_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own macro targets" ON public.macro_targets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own macro targets" ON public.macro_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own macro targets" ON public.macro_targets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Parents view daughter macro targets" ON public.macro_targets
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM parent_connections
    WHERE parent_user_id = auth.uid()
      AND daughter_user_id = macro_targets.user_id
      AND status = 'active'
  ));

CREATE TRIGGER macro_targets_updated_at
  BEFORE UPDATE ON public.macro_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Macro foods (tiles)
CREATE TABLE public.macro_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🍽️',
  meal_slot text NOT NULL DEFAULT 'breakfast', -- breakfast|lunch|dinner|snack
  kind text NOT NULL DEFAULT 'base',           -- base|variation|addon
  parent_id uuid REFERENCES public.macro_foods(id) ON DELETE SET NULL,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fats numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.macro_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own macro foods" ON public.macro_foods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own macro foods" ON public.macro_foods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own macro foods" ON public.macro_foods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own macro foods" ON public.macro_foods
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Parents view daughter macro foods" ON public.macro_foods
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM parent_connections
    WHERE parent_user_id = auth.uid()
      AND daughter_user_id = macro_foods.user_id
      AND status = 'active'
  ));

CREATE TRIGGER macro_foods_updated_at
  BEFORE UPDATE ON public.macro_foods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_macro_foods_user_slot ON public.macro_foods(user_id, meal_slot);

-- Macro logs
CREATE TABLE public.macro_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_slot text NOT NULL DEFAULT 'breakfast',
  food_id uuid,
  food_name text NOT NULL,
  emoji text NOT NULL DEFAULT '🍽️',
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fats numeric NOT NULL DEFAULT 0,
  quantity numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.macro_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own macro logs" ON public.macro_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own macro logs" ON public.macro_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own macro logs" ON public.macro_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own macro logs" ON public.macro_logs
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Parents view daughter macro logs" ON public.macro_logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM parent_connections
    WHERE parent_user_id = auth.uid()
      AND daughter_user_id = macro_logs.user_id
      AND status = 'active'
  ));

CREATE INDEX idx_macro_logs_user_date ON public.macro_logs(user_id, log_date);
