import { supabase } from "@/integrations/supabase/client";

export type Status = "pending" | "approved" | "rejected";

export type SiteSettings = {
  id: number;
  brand_name: string;
  tagline: string;
  whatsapp: string;
  price_per_account: number;
  min_withdraw: number;
  ewallets: string[];
  announcement: string;
  rules: string;
  deposits_open: boolean;
};

export type Deposit = {
  id: string;
  user_id: string;
  gmail_address: string;
  status: Status;
  price: number;
  admin_note: string;
  created_at: string;
};

export type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  ewallet: string;
  ewallet_number: string;
  ewallet_name: string;
  status: Status;
  admin_note: string;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  balance: number;
  created_at: string;
};

export const rupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    Number(value) || 0,
  );

export const settingsQuery = {
  queryKey: ["site-settings"],
  queryFn: async (): Promise<SiteSettings> => {
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as unknown as SiteSettings;
  },
};

export const statusLabel: Record<Status, string> = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export const statusTone: Record<Status, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};
