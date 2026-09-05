DROP FUNCTION IF EXISTS public.my_referral_stats();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_earned numeric NOT NULL DEFAULT 0;

UPDATE public.profiles p SET
  referral_count = COALESCE((SELECT count(*) FROM public.profiles c WHERE c.referred_by = p.id), 0),
  referral_earned = COALESCE((SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.user_id = p.id), 0);

CREATE OR REPLACE FUNCTION public.award_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target int;
  commission numeric;
  enabled boolean;
  total int;
BEGIN
  IF NEW.referred_by IS NULL THEN RETURN NEW; END IF;

  SELECT count(*) INTO total FROM public.profiles WHERE referred_by = NEW.referred_by;
  UPDATE public.profiles SET referral_count = total WHERE id = NEW.referred_by;

  SELECT referral_target, referral_commission, referral_enabled
    INTO target, commission, enabled FROM public.site_settings WHERE id = 1;
  IF NOT COALESCE(enabled, false) OR COALESCE(target, 0) < 1 OR COALESCE(commission, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF total % target = 0 THEN
    INSERT INTO public.referral_rewards (user_id, amount, note)
    VALUES (NEW.referred_by, commission, 'Komisi ' || target || ' undangan (total ' || total || ')');
    UPDATE public.profiles SET referral_earned = referral_earned + commission WHERE id = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.award_referral() FROM PUBLIC, anon, authenticated;