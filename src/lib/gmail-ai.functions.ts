import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_COUNTS = [1, 5, 10, 20] as const;

export const generateGmailIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { count?: number }) => {
    const count = Number(input?.count);
    return { count: (ALLOWED_COUNTS as readonly number[]).includes(count) ? count : 5 };
  })
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
              "Kamu membuat ide nama alamat Gmail baru. Balas HANYA JSON array berisi string alamat lengkap berakhiran @gmail.com. Aturan ketat: huruf kecil semua, TANPA titik, TANPA garis bawah, TANPA spasi, TANPA simbol apa pun. Nama harus berunsur nama orang (nama depan, nama belakang, atau gabungan nama orang Indonesia/internasional) yang natural dan mudah dibaca. WAJIB diakhiri TEPAT 3 angka di belakang nama (contoh: budisantoso482@gmail.com). Panjang bagian nama 6-20 karakter. Setiap saran harus unik dan acak. Jangan menyertakan kata sandi atau penjelasan apa pun.",
          },
          {
            role: "user",
            content: `Buat TEPAT ${data.count} ide alamat gmail acak berunsur nama orang, mudah dibaca, masing-masing diakhiri tepat 3 angka.`,
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
        const digits = (stripped.match(/[0-9]/g) ?? []).join("");
        // Tepat 3 angka di belakang: tambah angka acak bila kurang, potong bila lebih
        const need = Math.max(0, 3 - digits.length);
        const extra = Array.from({ length: need }, () => Math.floor(Math.random() * 10)).join("");
        return `${letters.slice(0, 17)}${(digits + extra).slice(0, 3)}`;
      })
      .filter((local) => /[a-z]{3,}/.test(local) && local.length >= 6)
      .map((local) => `${local}@gmail.com`);
    const suggestions = Array.from(new Set(cleaned)).slice(0, data.count);
    return { suggestions, error: suggestions.length ? null : "Tidak ada saran yang dihasilkan." };
  });
