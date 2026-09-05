CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS TABLE (invited integer, commission numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*)::int FROM public.profiles p WHERE p.referred_by = auth.uid()),
    (SELECT COALESCE(SUM(r.amount), 0) FROM public.referral_rewards r WHERE r.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.my_referral_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_stats() TO authenticated;