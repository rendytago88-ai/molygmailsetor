import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PayoutStatus = "unpaid" | "processing" | "paid" | "failed" | "manual_required";

export const payoutStatusLabel: Record<PayoutStatus, string> = {
  unpaid: "BELUM DIKIRIM",
  processing: "DIPROSES",
  paid: "DANA TERKIRIM",
  failed: "GAGAL KIRIM",
  manual_required: "PERLU TRANSFER MANUAL",
};

type ProviderResult = { ok: boolean; ref: string; error: string };

/** Kirim dana ke e-wallet via penyedia disbursement. */
async function sendToEwallet(input: {
  provider: string;
  amount: number;
  channel: string;
  accountNumber: string;
  accountName: string;
  referenceId: string;
}): Promise<ProviderResult> {
  const key = process.env["PAYOUT_API_KEY"] ?? "";
  if (!key) {
    return {
      ok: false,
      ref: "",
      error:
        "Penyedia pencairan belum terhubung. Tambahkan kunci API penyedia (mis. Xendit/Midtrans Iris) agar dana terkirim otomatis.",
    };
  }

  if (input.provider === "xendit") {
    const channelMap: Record<string, string> = {
      DANA: "ID_DANA",
      GoPay: "ID_GOPAY",
      OVO: "ID_OVO",
      ShopeePay: "ID_SHOPEEPAY",
    };
    const channelCode = channelMap[input.channel];
    if (!channelCode) return { ok: false, ref: "", error: `E-wallet ${input.channel} tidak didukung penyedia.` };

    try {
      const res = await fetch("https://api.xendit.co/v2/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-key": input.referenceId,
          Authorization: `Basic ${btoa(`${key}:`)}`,
        },
        body: JSON.stringify({
          reference_id: input.referenceId,
          channel_code: channelCode,
          channel_properties: {
            account_number: input.accountNumber,
            account_holder_name: input.accountName,
          },
          amount: input.amount,
          currency: "IDR",
ковых        }),
      });
      const json = (await res.json()) as { id?: string; message?: string; error_code?: string };
      if (!res.ok) return { ok: false, ref: "", error: json.message ?? json.error_code ?? "Pencairan ditolak penyedia." };
      return { ok: true, ref: json.id ?? input.referenceId, error: "" };
    } catch {
      return { ok: false, ref: "", error: "Tidak bisa menghubungi penyedia pencairan." };
    }
  }

  return { ok: false, ref: "", error: `Penyedia "${input.provider}" belum didukung.` };
}

export const processPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { withdrawalId: string }) => {
    if (!input?.withdrawalId) throw new Error("withdrawalId wajib diisi");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) throw new Error("Hanya admin yang dapat memproses pencairan.");

    const { data: wd, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", data.withdrawalId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!wd) throw new Error("Penarikan tidak ditemukan.");
    if (wd.status !== "approved") throw new Error("Penarikan harus disetujui dulu.");
    if (wd.payout_status === "paid") return { status: "paid" as PayoutStatus, message: "Dana sudah terkirim." };

    const { data: settings } = await supabase
      .from("site_settings")
      .select("payout_provider, payout_auto")
      .eq("id", 1)
      .maybeSingle();

    await supabase.from("withdrawals").update({ payout_status: "processing", payout_error: "" }).eq("id", wd.id);

    const result = await sendToEwallet({
      provider: settings?.payout_provider ?? "manual",
      amount: Number(wd.amount),
      channel: wd.ewallet,
      accountNumber: wd.ewallet_number,
      accountName: wd.ewallet_name,
      referenceId: wd.id,
    });

    const next: PayoutStatus = result.ok ? "paid" : "manual_required";
    await supabase
      .from("withdrawals")
      .update({
        payout_status: next,
        payout_ref: result.ref,
        payout_error: result.error.slice(0, 300),
        paid_at: result.ok ? new Date().toISOString() : null,
      })
      .eq("id", wd.id);

    return {
      status: next,
      message: result.ok ? "Dana berhasil dikirim ke e-wallet pengguna." : result.error,
    };
  });
