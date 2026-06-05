CREATE OR REPLACE FUNCTION public.cap_spot_expiry(_spot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.parking_spots
    SET expires_at = LEAST(expires_at, now() + interval '2 hours')
    WHERE id = _spot_id AND status = 'available';
END;
$$;