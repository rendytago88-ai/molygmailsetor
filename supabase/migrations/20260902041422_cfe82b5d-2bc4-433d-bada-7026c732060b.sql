ALTER TABLE public.withdrawals
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payout_ref text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payout_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payout_provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS payout_auto boolean NOT NULL DEFAULT true;