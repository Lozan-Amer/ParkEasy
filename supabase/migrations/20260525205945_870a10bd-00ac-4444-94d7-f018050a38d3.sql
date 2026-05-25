CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.parked_cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  note text,
  photo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parked_cars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own parked car" ON public.parked_cars
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own parked car" ON public.parked_cars
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own parked car" ON public.parked_cars
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own parked car" ON public.parked_cars
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_parked_cars_updated_at
  BEFORE UPDATE ON public.parked_cars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('parked-cars', 'parked-cars', false);

CREATE POLICY "Users view own parked car photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'parked-cars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own parked car photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'parked-cars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own parked car photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'parked-cars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own parked car photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'parked-cars' AND auth.uid()::text = (storage.foldername(name))[1]);