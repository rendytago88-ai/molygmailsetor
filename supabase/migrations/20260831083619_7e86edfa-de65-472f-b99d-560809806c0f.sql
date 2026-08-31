ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS general text NOT NULL DEFAULT 'Layanan ini menerima setoran alamat Gmail aktif. Setiap setoran diverifikasi manual oleh admin, lalu saldo bisa ditarik ke e-wallet.',
  ADD COLUMN IF NOT EXISTS general_title text NOT NULL DEFAULT 'Informasi Umum',
  ADD COLUMN IF NOT EXISTS rules_title text NOT NULL DEFAULT 'Syarat & Ketentuan',
  ADD COLUMN IF NOT EXISTS whatsapp_group text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp_channel text NOT NULL DEFAULT '';