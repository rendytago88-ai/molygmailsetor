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
  rules_title: string;
  rules_images: string[];
  general: string;
  general_title: string;
  whatsapp_group: string;
  whatsapp_channel: string;
  deposits_open: boolean;
  payout_provider: string;
  payout_auto: boolean;
  referral_enabled: boolean;
  referral_target: number;
  referral_commission: number;
  referral_info: string;
};

export type ReferralReward = {
  id: string;
  user_id: string;
  amount: number;
  note: string;
  created_at: string;
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
  payout_status: string;
  payout_ref: string;
  payout_error: string;
  paid_at: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  balance: number;
  created_at: string;
  referral_code: string | null;
  referred_by: string | null;
  referral_count: number;
  referral_earned: number;
  banned: boolean;
  banned_reason: string;
  banned_at: string | null;
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

export const RULES_BUCKET = "site-images";

export async function signRulesImages(paths: string[]): Promise<string[]> {
  const clean = (paths ?? []).filter(Boolean);
  if (!clean.length) return [];
  const { data } = await supabase.storage.from(RULES_BUCKET).createSignedUrls(clean, 60 * 60);
  return (data ?? []).map((d) => d.signedUrl).filter(Boolean) as string[];
}

export const statusLabel: Record<Status, string> = {
  pending: "PENDING",
  approved: "DITERIMA",
  rejected: "DITOLAK",
};

export const statusTone: Record<Status, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

// Jadwal setoran otomatis (WIB / UTC+7): buka 07.00-16.00, tutup Sabtu & Minggu.
export const DEPOSIT_OPEN_HOUR = 7;
export const DEPOSIT_CLOSE_HOUR = 16;

export function wibParts(date: Date = new Date()) {
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return { day: wib.getUTCDay(), hour: wib.getUTCHours(), minute: wib.getUTCMinutes() };
}

export function depositScheduleOpen(date: Date = new Date()) {
  const { day, hour } = wibParts(date);
  if (day === 0 || day === 6) return false;
  return hour >= DEPOSIT_OPEN_HOUR && hour < DEPOSIT_CLOSE_HOUR;
}

export function depositScheduleMessage(date: Date = new Date()) {
  const { day, hour } = wibParts(date);
  if (day === 0 || day === 6) return "Setoran tutup pada hari Sabtu & Minggu. Buka lagi Senin pukul 07.00 WIB.";
  if (hour < DEPOSIT_OPEN_HOUR) return "Setoran dibuka otomatis pukul 07.00 WIB.";
  if (hour >= DEPOSIT_CLOSE_HOUR) return "Setoran ditutup otomatis pukul 16.00 WIB. Buka lagi besok pukul 07.00 WIB.";
  return "Setoran dibuka setiap Senin-Jumat, pukul 07.00-16.00 WIB.";
}
