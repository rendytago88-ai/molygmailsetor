-- roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- settings singleton
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  brand_name TEXT NOT NULL DEFAULT 'Setor Gmail',
  tagline TEXT NOT NULL DEFAULT 'Setor alamat Gmail, pantau saldo, dan tarik dana ke e-wallet.',
  whatsapp TEXT NOT NULL DEFAULT '6287796701732',
  price_per_account NUMERIC(14,2) NOT NULL DEFAULT 3000,
  min_withdraw NUMERIC(14,2) NOT NULL DEFAULT 10000,
  ewallets TEXT[] NOT NULL DEFAULT ARRAY['DANA','OVO','GoPay','ShopeePay'],
  announcement TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT 'Kirim hanya alamat Gmail aktif milikmu sendiri. Jangan pernah mengirim kata sandi kepada siapa pun.',
  deposits_open BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_update" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.site_settings (id) VALUES (1);

-- deposits
CREATE TYPE public.item_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.gmail_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_address TEXT NOT NULL,
  status public.item_status NOT NULL DEFAULT 'pending',
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gmail_address)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gmail_deposits TO authenticated;
GRANT ALL ON public.gmail_deposits TO service_role;
ALTER TABLE public.gmail_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deposits_select" ON public.gmail_deposits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "deposits_insert_own" ON public.gmail_deposits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "deposits_update" ON public.gmail_deposits FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "deposits_delete" ON public.gmail_deposits FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'));

-- withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  ewallet TEXT NOT NULL,
  ewallet_number TEXT NOT NULL,
  ewallet_name TEXT NOT NULL,
  status public.item_status NOT NULL DEFAULT 'pending',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_select" ON public.withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wd_insert_own" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "wd_update" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "wd_delete" ON public.withdrawals FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'));

-- new user handling: profile + first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- balance maintenance
CREATE OR REPLACE FUNCTION public.recalc_balance(_user_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles p SET balance = GREATEST(0,
    COALESCE((SELECT SUM(price) FROM public.gmail_deposits d WHERE d.user_id = _user_id AND d.status = 'approved'), 0)
    - COALESCE((SELECT SUM(w.amount) FROM public.withdrawals w WHERE w.user_id = _user_id AND w.status IN ('pending','approved')), 0)
  ), updated_at = now()
  WHERE p.id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.after_balance_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_balance(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_deposit_balance AFTER INSERT OR UPDATE OR DELETE ON public.gmail_deposits
FOR EACH ROW EXECUTE FUNCTION public.after_balance_change();
CREATE TRIGGER trg_withdrawal_balance AFTER INSERT OR UPDATE OR DELETE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.after_balance_change();

-- prevent withdrawing more than balance
CREATE OR REPLACE FUNCTION public.check_withdraw_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bal NUMERIC;
  minw NUMERIC;
BEGIN
  SELECT balance INTO bal FROM public.profiles WHERE id = NEW.user_id;
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

CREATE TRIGGER trg_check_withdraw BEFORE INSERT ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.check_withdraw_balance();