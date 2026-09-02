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

REVOKE ALL ON FUNCTION public.enforce_deposit_schedule() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_deposit_schedule ON public.gmail_deposits;
CREATE TRIGGER trg_enforce_deposit_schedule
BEFORE INSERT ON public.gmail_deposits
FOR EACH ROW EXECUTE FUNCTION public.enforce_deposit_schedule();