import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const generateGmailIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { hint?: string }) => ({
    hint: String(input?.hint ?? "").slice(0, 60),
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { suggestions: [] as string[], error: "AI belum tersedia." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "Kamu membuat ide nama alamat Gmail baru. Balas HANYA JSON array berisi 6 string alamat lengkap berakhiran @gmail.com. Aturan ketat: huruf kecil semua, TANPA titik, TANPA garis bawah, TANPA spasi, TANPA simbol apa pun. Boleh diakhiri angka maksimal 3 digit (opsional), dan angka hanya boleh di akhir nama. Panjang bagian nama 6-20 karakter. Jangan menyertakan kata sandi atau penjelasan.",
          },
          {
            role: "user",
            content: data.hint
              ? `Buat ide alamat gmail bertema: ${data.hint}`
              : "Buat ide alamat gmail acak yang natural dan mudah diingat.",
          },
        ],
      }),
    });

    if (!res.ok) {
      return {
        suggestions: [] as string[],
        error: res.status === 429 ? "Terlalu banyak permintaan, coba lagi nanti." : "Gagal membuat saran.",
      };
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = json.choices?.[0]?.message?.content ?? "";
    const matches = text.match(/[a-z0-9._%+-]+@gmail\.com/gi) ?? [];
    const cleaned = matches
      .map((m) => m.toLowerCase().split("@")[0] ?? "")
      .map((local) => {
        const stripped = local.replace(/[^a-z0-9]/g, "");
        const letters = stripped.replace(/[0-9]/g, "");
        const digits = (stripped.match(/[0-9]/g) ?? []).join("").slice(0, 3);
        return `${letters.slice(0, 17)}${digits}`;
      })
      .filter((local) => local.length >= 6)
      .map((local) => `${local}@gmail.com`);
    const suggestions = Array.from(new Set(cleaned)).slice(0, 6);
    return { suggestions, error: suggestions.length ? null : "Tidak ada saran yang dihasilkan." };
  });
