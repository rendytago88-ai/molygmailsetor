import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALLOWED_COUNTS = [1, 5, 10, 20] as const;

function randomDigits(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join("");
}

export const generateGmailIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { count?: number }) => {
    const count = Number(input?.count);
    return { count: (ALLOWED_COUNTS as readonly number[]).includes(count) ? count : 5 };
  })
  .handler(async ({ data, context }) => {
    // Ambil gmail yang didaftarkan user, lalu pakai nama depannya sebagai prefix
    const { data: userData } = await context.supabase.auth.getUser();
    const email = userData.user?.email ?? "";
    const local = email.split("@")[0] ?? "";
    // Prefix = huruf-huruf di awal alamat (nama), tanpa angka/simbol
    const prefix = (local.match(/^[a-zA-Z]+/)?.[0] ?? local.replace(/[^a-zA-Z]/g, "")).toLowerCase();
    if (!prefix || prefix.length < 2) {
      return { suggestions: [] as string[], error: "Nama gmail akunmu tidak bisa dipakai sebagai awalan." };
    }

    const suggestions = new Set<string>();
    let guard = 0;
    while (suggestions.size < data.count && guard < data.count * 20) {
      guard++;
      // Acak: sebagian 3 angka, sebagian 2 angka di belakang prefix
      const digits = randomDigits(Math.random() < 0.5 ? 3 : 2);
      suggestions.add(`${prefix}${digits}@gmail.com`);
    }
    return { suggestions: Array.from(suggestions), error: null };
  });
