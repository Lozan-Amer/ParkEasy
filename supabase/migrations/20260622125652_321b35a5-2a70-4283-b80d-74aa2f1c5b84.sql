
-- 1) Profiles: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 2) Revoke EXECUTE on SECURITY DEFINER trigger functions from anon/authenticated
REVOKE ALL ON FUNCTION public.award_score_on_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_wrong_report() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 3) Convert RPCs to SECURITY INVOKER so RLS on parking_spots enforces ownership
CREATE OR REPLACE FUNCTION public.cap_spot_expiry(_spot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.parking_spots
    SET expires_at = LEAST(expires_at, now() + interval '2 hours')
    WHERE id = _spot_id AND status = 'available';
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_spot_taken(_spot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.parking_spots
    SET status = 'taken', removed_at = now()
    WHERE id = _spot_id AND status = 'available';
END;
$function$;
