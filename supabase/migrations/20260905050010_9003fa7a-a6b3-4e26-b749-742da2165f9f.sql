ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS banned_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS banned_at timestamptz;

CREATE OR REPLACE FUNCTION public.enforce_deposit_schedule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wib timestamp := (now() AT TIME ZONE 'Asia/Jakarta');
  d int := EXTRACT(DOW FROM wib);
  h int := EXTRACT(HOUR FROM wib);
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.user_id AND p.banned) THEN
    RAISE EXCEPTION 'Akun kamu diblokir oleh admin.';
  END IF;
  IF private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF d = 0 OR d = 6 THEN
    RAISE EXCEPTION 'Setoran tutup pada hari Sabtu & Minggu.';
  END IF;
  IF h < 7 OR h >= 16 THEN
    RAISE EXCEPTION 'Setoran hanya dibuka pukul 07.00-16.00 WIB.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_withdraw_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bal NUMERIC;
  minw NUMERIC;
  isbanned boolean;
BEGIN
  SELECT balance, banned INTO bal, isbanned FROM public.profiles WHERE id = NEW.user_id;
  IF COALESCE(isbanned, false) THEN
    RAISE EXCEPTION 'Akun kamu diblokir oleh admin.';
  END IF;
  SELECT min_withdraw INTO minw FROM public.site_settings WHERE id = 1;
  IF NEW.amount > COALESCE(bal, 0) THEN
    RAISE EXCEPTION 'Saldo tidak mencukupi';
  END IF;
  IF NEW.amount < COALESCE(minw, 0) THEN
    RAISE EXCEPTION 'Jumlah di bawah minimal penarikan';
  END IF;
  RETURN NEW;
END;
$$;