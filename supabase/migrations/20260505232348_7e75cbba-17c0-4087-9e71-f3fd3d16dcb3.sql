ALTER TABLE public.macro_logs ADD COLUMN is_planned boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_macro_logs_user_date_planned ON public.macro_logs(user_id, log_date, is_planned);