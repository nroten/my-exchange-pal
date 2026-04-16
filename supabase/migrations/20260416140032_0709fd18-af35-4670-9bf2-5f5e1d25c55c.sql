
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'daughter' CHECK (role IN ('daughter', 'parent')),
  setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Daily targets table
CREATE TABLE public.daily_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  starches NUMERIC NOT NULL DEFAULT 6,
  fruits NUMERIC NOT NULL DEFAULT 3,
  vegetables NUMERIC NOT NULL DEFAULT 5,
  proteins NUMERIC NOT NULL DEFAULT 6,
  dairy NUMERIC NOT NULL DEFAULT 3,
  fats NUMERIC NOT NULL DEFAULT 4,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own targets" ON public.daily_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own targets" ON public.daily_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own targets" ON public.daily_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_daily_targets_updated_at BEFORE UPDATE ON public.daily_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meal logs table
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_label TEXT NOT NULL CHECK (meal_label IN ('Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Evening Snack')),
  food_items JSONB NOT NULL DEFAULT '[]',
  total_starches NUMERIC NOT NULL DEFAULT 0,
  total_fruits NUMERIC NOT NULL DEFAULT 0,
  total_vegetables NUMERIC NOT NULL DEFAULT 0,
  total_proteins NUMERIC NOT NULL DEFAULT 0,
  total_dairy NUMERIC NOT NULL DEFAULT 0,
  total_fats NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own meal logs" ON public.meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal logs" ON public.meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs" ON public.meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal logs" ON public.meal_logs FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_meal_logs_user_date ON public.meal_logs (user_id, log_date);
CREATE TRIGGER update_meal_logs_updated_at BEFORE UPDATE ON public.meal_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parent connections table
CREATE TABLE public.parent_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  daughter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.parent_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daughters can view own connections" ON public.parent_connections FOR SELECT USING (auth.uid() = daughter_user_id);
CREATE POLICY "Parents can view their connections" ON public.parent_connections FOR SELECT USING (auth.uid() = parent_user_id);
CREATE POLICY "Daughters can create connections" ON public.parent_connections FOR INSERT WITH CHECK (auth.uid() = daughter_user_id);
CREATE POLICY "Daughters can update own connections" ON public.parent_connections FOR UPDATE USING (auth.uid() = daughter_user_id);
-- Allow anyone authenticated to look up by PIN (for connecting)
CREATE POLICY "Anyone can look up by pin" ON public.parent_connections FOR SELECT USING (true);
CREATE TRIGGER update_parent_connections_updated_at BEFORE UPDATE ON public.parent_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Parents need to read daughter's meal logs and targets
CREATE POLICY "Parents can view connected daughter meal logs" ON public.meal_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.parent_connections WHERE parent_user_id = auth.uid() AND daughter_user_id = meal_logs.user_id AND status = 'active')
);
CREATE POLICY "Parents can view connected daughter targets" ON public.daily_targets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.parent_connections WHERE parent_user_id = auth.uid() AND daughter_user_id = daily_targets.user_id AND status = 'active')
);
CREATE POLICY "Parents can view connected daughter profile" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.parent_connections WHERE parent_user_id = auth.uid() AND daughter_user_id = profiles.user_id AND status = 'active')
);

-- Encouragement messages
CREATE TABLE public.encouragement_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 150),
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.encouragement_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Senders can insert messages" ON public.encouragement_messages FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Recipients can view messages" ON public.encouragement_messages FOR SELECT USING (auth.uid() = to_user_id);
CREATE POLICY "Recipients can update dismiss status" ON public.encouragement_messages FOR UPDATE USING (auth.uid() = to_user_id);

-- Allow parent to update connection (claim it)
CREATE POLICY "Parents can claim connections" ON public.parent_connections FOR UPDATE USING (
  (parent_user_id IS NULL OR parent_user_id = auth.uid())
);
