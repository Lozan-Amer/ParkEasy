-- Add columns to track wrong reports on parking spots
ALTER TABLE public.parking_spots
  ADD COLUMN IF NOT EXISTS wrong_report_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS removed_at timestamp with time zone;

-- Table to track who flagged each spot as wrong (prevent double flagging)
CREATE TABLE IF NOT EXISTS public.spot_wrong_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.parking_spots(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (spot_id, user_id)
);

ALTER TABLE public.spot_wrong_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wrong reports viewable by authenticated"
ON public.spot_wrong_reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can flag wrong report"
ON public.spot_wrong_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger: 1 wrong report removes the spot and penalizes reporter
CREATE OR REPLACE FUNCTION public.handle_wrong_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reporter_id uuid;
BEGIN
  UPDATE public.parking_spots
    SET wrong_report_count = wrong_report_count + 1,
        status = 'removed',
        removed_at = now()
    WHERE id = NEW.spot_id
    RETURNING user_id INTO reporter_id;

  IF reporter_id IS NOT NULL THEN
    UPDATE public.profiles
      SET score = GREATEST(score - 10, 0), updated_at = now()
      WHERE id = reporter_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_wrong_report_insert ON public.spot_wrong_reports;
CREATE TRIGGER on_wrong_report_insert
AFTER INSERT ON public.spot_wrong_reports
FOR EACH ROW EXECUTE FUNCTION public.handle_wrong_report();
