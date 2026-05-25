REVOKE EXECUTE ON FUNCTION public.handle_wrong_report() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.award_score_on_report() FROM PUBLIC, authenticated, anon;