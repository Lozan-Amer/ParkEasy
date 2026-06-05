CREATE OR REPLACE FUNCTION public.handle_wrong_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.parking_spots
    SET wrong_report_count = wrong_report_count + 1,
        status = 'removed',
        removed_at = now()
    WHERE id = NEW.spot_id;
  RETURN NEW;
END;
$$;