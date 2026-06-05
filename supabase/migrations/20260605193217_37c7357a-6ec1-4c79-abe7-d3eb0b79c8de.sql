CREATE OR REPLACE FUNCTION public.mark_spot_taken(_spot_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.parking_spots
    SET status = 'taken', removed_at = now()
    WHERE id = _spot_id AND status = 'available';
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_spot_taken(uuid) TO authenticated;