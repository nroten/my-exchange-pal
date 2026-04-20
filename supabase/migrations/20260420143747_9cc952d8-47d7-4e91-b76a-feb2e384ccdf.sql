CREATE TABLE public.saved_meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  default_meal_label TEXT,
  food_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved meals"
  ON public.saved_meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved meals"
  ON public.saved_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved meals"
  ON public.saved_meals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved meals"
  ON public.saved_meals FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER set_saved_meals_updated_at
  BEFORE UPDATE ON public.saved_meals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_saved_meals_user_id ON public.saved_meals(user_id);