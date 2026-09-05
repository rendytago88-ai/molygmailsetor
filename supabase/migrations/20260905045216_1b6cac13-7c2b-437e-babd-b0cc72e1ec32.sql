REVOKE ALL ON FUNCTION public.gen_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_referral() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;