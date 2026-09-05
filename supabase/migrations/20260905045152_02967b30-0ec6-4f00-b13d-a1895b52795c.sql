ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c text;
BEGIN
  LOOP
    c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = c);
  END LOOP;
  RETURN c;
END;
$$;

UPDATE public.profiles SET referral_code = public.gen_referral_code() WHERE referral_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS referral_target integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS referral_commission numeric NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS referral_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS referral_info text NOT NULL DEFAULT 'Ajak teman memakai kode undanganmu. Setiap target undangan tercapai, komisi otomatis masuk ke saldo.';

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_rewards TO authenticated;
GRANT ALL ON public.referral_rewards TO service_role;

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_rewards_select" ON public.referral_rewards
  FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_referral_rewards_updated_at
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- saldo memperhitungkan komisi referral
CREATE OR REPLACE FUNCTION public.recalc_balance(_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles p SET balance = GREATEST(0,
    COALESCE((SELECT SUM(price) FROM public.gmail_deposits d WHERE d.user_id = _user_id AND d.status = 'approved'), 0)
    + COALESCE((SELECT SUM(r.amount) FROM public.referral_rewards r WHERE r.user_id = _user_id), 0)
    - COALESCE((SELECT SUM(w.amount) FROM public.withdrawals w WHERE w.user_id = _user_id AND w.status IN ('pending','approved')), 0)
  ), updated_at = now()
  WHERE p.id = _user_id;
$$;

CREATE TRIGGER trg_referral_reward_balance
  AFTER INSERT OR UPDATE OR DELETE ON public.referral_rewards
  FOR EACH ROW EXECUTE FUNCTION public.after_balance_change();

-- beri komisi saat target undangan tercapai
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
  SELECT referral_target, referral_commission, referral_enabled
    INTO target, commission, enabled FROM public.site_settings WHERE id = 1;
  IF NOT COALESCE(enabled, false) OR COALESCE(target, 0) < 1 OR COALESCE(commission, 0) <= 0 THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO total FROM public.profiles WHERE referred_by = NEW.referred_by;
  IF total % target = 0 THEN
    INSERT INTO public.referral_rewards (user_id, amount, note)
    VALUES (NEW.referred_by, commission, 'Komisi ' || target || ' undangan (total ' || total || ')');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_referral
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.award_referral();

-- daftar baru: buat kode referral & catat pengundang
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code text := NULLIF(upper(trim(COALESCE(NEW.raw_user_meta_data->>'ref', ''))), '');
  inviter uuid;
BEGIN
  IF ref_code IS NOT NULL THEN
    SELECT id INTO inviter FROM public.profiles WHERE referral_code = ref_code;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
          public.gen_referral_code(), inviter)
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;