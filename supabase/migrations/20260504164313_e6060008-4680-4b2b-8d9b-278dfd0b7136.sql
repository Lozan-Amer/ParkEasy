
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Parking spot reports
CREATE TABLE public.parking_spots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  status TEXT NOT NULL DEFAULT 'available' -- available | taken | expired
);

CREATE INDEX idx_parking_active ON public.parking_spots (expires_at) WHERE status = 'available';

ALTER TABLE public.parking_spots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parking spots are viewable by authenticated users"
  ON public.parking_spots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can report spots"
  ON public.parking_spots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own spots"
  ON public.parking_spots FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Award score to reporter on insert
CREATE OR REPLACE FUNCTION public.award_score_on_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET score = score + 10, updated_at = now() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_parking_spot_reported
  AFTER INSERT ON public.parking_spots
  FOR EACH ROW EXECUTE FUNCTION public.award_score_on_report();

-- Enable realtime
ALTER TABLE public.parking_spots REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parking_spots;
