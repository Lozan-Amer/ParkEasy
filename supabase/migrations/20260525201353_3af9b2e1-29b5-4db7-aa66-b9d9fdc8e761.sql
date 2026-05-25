DROP TRIGGER IF EXISTS award_score_after_parking_report ON public.parking_spots;
CREATE TRIGGER award_score_after_parking_report
AFTER INSERT ON public.parking_spots
FOR EACH ROW
EXECUTE FUNCTION public.award_score_on_report();

-- Backfill missing profiles for existing users
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Backfill missing score points (10 per spot reported) for past reports
UPDATE public.profiles p
SET score = sub.total, updated_at = now()
FROM (
  SELECT user_id, COUNT(*) * 10 AS total
  FROM public.parking_spots
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id AND p.score < sub.total;

-- Ensure new auth users get a profile via trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();