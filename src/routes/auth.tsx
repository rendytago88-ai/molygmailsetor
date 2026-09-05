import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { settingsQuery } from "@/lib/app-data";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk atau Daftar — Setor Gmail" },
      { name: "description", content: "Masuk ke akunmu untuk menyetor alamat Gmail dan menarik saldo." },
      { property: "og:title", content: "Masuk atau Daftar — Setor Gmail" },
      { property: "og:description", content: "Masuk untuk menyetor alamat Gmail dan menarik saldo." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Kata sandi minimal 6 karakter").max(72),
  fullName: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: settings } = useQuery(settingsQuery);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [refCode, setRefCode] = useState(() => {
    if (typeof window === "undefined") return "";
    return (new URLSearchParams(window.location.search).get("ref") ?? "").toUpperCase();
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ref")) {
      setMode("register");
    }
  }, []);


  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Data tidak valid");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password });
        if (error) throw error;
        toast.success("Berhasil masuk");
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: parsed.data.fullName || parsed.data.email.split("@")[0],
              ref: refCode.trim().toUpperCase().slice(0, 12),
            },
          },

        });
        if (error) throw error;
        toast.success("Akun dibuat. Silakan masuk.");
        setMode("login");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(
        msg.includes("Invalid login credentials")
          ? "Email atau kata sandi salah"
          : msg.includes("already registered")
            ? "Email sudah terdaftar"
            : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Gagal masuk dengan Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sky px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Kembali
        </Link>

        <div className="surface-card p-7">
          <span className="grid size-11 place-items-center rounded-xl bg-brand text-primary-foreground">
            <Mail className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">
            {mode === "login" ? "Masuk ke" : "Daftar di"} {settings?.brand_name ?? "Setor Gmail"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola setoran alamat Gmail dan saldo kamu.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nama kamu"
                  maxLength={80}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={busy}>
              {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full rounded-full" onClick={onGoogle}>
            Lanjutkan dengan Google
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </div>
      </div>
    </div>
  );
}
