import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { LogOut, Mail, MessageCircle, Plus, Radio, Shield, Sparkles, Trash2, Users, Wallet } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateGmailIdeas } from "@/lib/gmail-ai.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin } from "@/hooks/useAuth";
import {
  depositScheduleMessage,
  depositScheduleOpen,
  rupiah,
  settingsQuery,
  statusLabel,
  statusTone,
  type Deposit,
  type Profile,
  type Withdrawal,
} from "@/lib/app-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Setor Gmail" },
      { name: "description", content: "Pantau setoran Gmail, saldo, dan penarikan dana kamu." },
      { property: "og:title", content: "Dashboard — Setor Gmail" },
      { property: "og:description", content: "Pantau setoran Gmail, saldo, dan penarikan dana kamu." },
    ],
  }),
  component: Dashboard,
});

const gmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Alamat Gmail tidak valid")
  .max(255)
  .refine((v) => v.endsWith("@gmail.com"), "Harus alamat @gmail.com");

function StatusPill({ status }: { status: keyof typeof statusLabel }) {
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[status]}`}>
      {statusLabel[status]}
    </span>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { data: settings } = useQuery(settingsQuery);

  const [gmail, setGmail] = useState("");
  const [amount, setAmount] = useState("");
  const [ewallet, setEwallet] = useState("");
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  const [hint, setHint] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const genFn = useServerFn(generateGmailIdeas);
  const gmailCount = gmail.split(/[\n,;\s]+/).filter((l) => l.trim().length > 0).length;

  async function generateIdeas() {
    setAiBusy(true);
    try {
      const res = await genFn({ data: { hint } });
      if (res.error) toast.error(res.error);
      setIdeas(res.suggestions ?? []);
    } catch {
      toast.error("Gagal membuat saran.");
    } finally {
      setAiBusy(false);
    }
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data as unknown as Profile;
    },
  });

  const deposits = useQuery({
    queryKey: ["deposits", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Deposit[]> => {
      const { data, error } = await supabase
        .from("gmail_deposits")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Deposit[];
    },
  });

  const withdrawals = useQuery({
    queryKey: ["withdrawals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Withdrawal[];
    },
  });

  const history = [
    ...(deposits.data ?? []).map((d) => ({
      kind: "setor" as const,
      id: d.id,
      title: d.gmail_address,
      status: d.status,
      admin_note: d.admin_note,
      created_at: d.created_at,
    })),
    ...(withdrawals.data ?? []).map((w) => ({
      kind: "tarik" as const,
      id: w.id,
      title: `${rupiah(w.amount)} → ${w.ewallet} ${w.ewallet_number}`,
      status: w.status,
      admin_note: w.admin_note,
      created_at: w.created_at,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["deposits"] });
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
  };

  async function addDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositScheduleOpen()) {
      toast.error(depositScheduleMessage());
      return;
    }
    const lines = gmail
      .split(/[\n,;\s]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error("Masukkan minimal 1 alamat Gmail");
      return;
    }
    if (lines.length > 99) {
      toast.error("Maksimal 99 baris per setoran");
      return;
    }

    const valid: string[] = [];
    for (const line of lines) {
      const parsed = gmailSchema.safeParse(line);
      if (!parsed.success) {
        toast.error(`${line}: ${parsed.error.issues[0]?.message ?? "Alamat tidak valid"}`);
        return;
      }
      if (!valid.includes(parsed.data)) valid.push(parsed.data);
    }

    setBusy(true);
    const { error } = await supabase.from("gmail_deposits").insert(
      valid.map((address) => ({
        user_id: user!.id,
        gmail_address: address,
        price: settings?.price_per_account ?? 0,
      })),
    );
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Ada alamat Gmail yang sudah pernah disetor" : error.message);
      return;
    }
    setGmail("");
    toast.success(`${valid.length} setoran terkirim, menunggu verifikasi admin`);
    refresh();
  }

  async function removeDeposit(id: string) {
    const { error } = await supabase.from("gmail_deposits").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Setoran dihapus");
    refresh();
  }

  async function requestWithdraw(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Jumlah tidak valid");
      return;
    }
    if (!ewallet) {
      toast.error("Pilih e-wallet");
      return;
    }
    if (number.trim().length < 6) {
      toast.error("Nomor e-wallet tidak valid");
      return;
    }
    if (holder.trim().length < 2) {
      toast.error("Nama pemilik tidak valid");
      return;
    }

    setBusy(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user!.id,
      amount: value,
      ewallet,
      ewallet_number: number.trim().slice(0, 30),
      ewallet_name: holder.trim().slice(0, 80),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    setAmount("");
    setNumber("");
    setHolder("");
    toast.success("Permintaan penarikan dikirim");
    refresh();
  }

  if (loading || !user) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat…</div>;
  }

  const scheduleOpen = depositScheduleOpen(now);
  const depositsOpen = (settings?.deposits_open ?? true) && scheduleOpen;
  const depositNotice = !scheduleOpen
    ? depositScheduleMessage(now)
    : !(settings?.deposits_open ?? true)
      ? "Setoran sedang ditutup sementara oleh admin."
      : depositScheduleMessage(now);

  return (
    <div className="min-h-screen bg-sky pb-16">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-primary-foreground">
              <Mail className="size-4" />
            </span>
            <span className="font-extrabold">{settings?.brand_name ?? "Setor Gmail"}</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link to="/admin">
                  <Shield className="size-4" /> Admin
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 pt-6">
        {settings?.announcement ? (
          <p className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
            {settings.announcement}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <a href={`https://wa.me/${settings?.whatsapp ?? ""}`} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" /> WhatsApp Admin
            </a>
          </Button>
          {settings?.whatsapp_group ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={settings.whatsapp_group} target="_blank" rel="noreferrer">
                <Users className="size-4" /> Grup
              </a>
            </Button>
          ) : null}
          {settings?.whatsapp_channel ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={settings.whatsapp_channel} target="_blank" rel="noreferrer">
                <Radio className="size-4" /> Channel
              </a>
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-card bg-brand p-6 text-primary-foreground sm:col-span-2">
            <p className="text-sm opacity-90">Saldo tersedia</p>
            <p className="mt-1 text-4xl font-extrabold">{rupiah(profile.data?.balance ?? 0)}</p>
            <p className="mt-2 text-xs opacity-80">
              Halo, {profile.data?.full_name ?? user.email} · {rupiah(settings?.price_per_account ?? 0)} / akun
            </p>
          </div>
          <div className="surface-card p-6">
            <p className="text-sm text-muted-foreground">Setoran disetujui</p>
            <p className="mt-1 text-3xl font-extrabold">
              {(deposits.data ?? []).filter((d) => d.status === "approved").length}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {(deposits.data ?? []).filter((d) => d.status === "pending").length} menunggu
            </p>
          </div>
        </div>

        <Tabs defaultValue="setor">
          <TabsList className="w-full">
            <TabsTrigger value="setor" className="flex-1">
              Setor Gmail
            </TabsTrigger>
            <TabsTrigger value="tarik" className="flex-1">
              Tarik Saldo
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="flex-1">
              Riwayat
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setor" className="space-y-4 pt-4">
            <div
              className={`rounded-xl border p-3 text-xs font-medium ${
                depositsOpen
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              {depositsOpen ? "Setoran DIBUKA" : "Setoran DITUTUP"} — {depositNotice}
            </div>
            <form onSubmit={addDeposit} className="surface-card space-y-3 p-6">
              <Label htmlFor="gmail">Alamat Gmail (bisa banyak, 1 baris 1 alamat, maks. 99)</Label>
              <Textarea
                id="gmail"
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder={"namakamu@gmail.com\nnamalain123@gmail.com"}
                disabled={!depositsOpen}
                rows={6}
                maxLength={26000}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{gmailCount} / 99 baris</p>
                <Button type="submit" className="rounded-full" disabled={busy || !depositsOpen}>
                  <Plus className="size-4" /> Setor {gmailCount > 1 ? `${gmailCount} akun` : ""}
                </Button>
              </div>
              <div className="rounded-xl border border-dashed border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="Tema nama (opsional), misal: nama pendek, hobi bola"
                    maxLength={60}
                  />
                  <Button type="button" variant="outline" className="rounded-full" onClick={generateIdeas} disabled={aiBusy}>
                    <Sparkles className="size-4" /> {aiBusy ? "Membuat..." : "Generate AI"}
                  </Button>
                </div>
                {ideas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ideas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setGmail((prev) => (prev.trim() ? `${prev.trim()}\n${idea}` : idea))}
                        className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Saran nama dibuat AI. Buat akun Gmail-nya sendiri, lalu setor alamatnya di sini. Jangan pernah
                  membagikan kata sandi.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {depositsOpen ? settings?.rules : depositNotice}
              </p>
            </form>

            <div className="surface-card divide-y divide-border overflow-hidden">
              {(deposits.data ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Belum ada setoran.</p>
              )}
              {(deposits.data ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.gmail_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString("id-ID")} · {rupiah(d.price)}
                      {d.admin_note ? ` · ${d.admin_note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusPill status={d.status} />
                    {d.status === "pending" && (
                      <Button variant="ghost" size="icon" onClick={() => removeDeposit(d.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tarik" className="space-y-4 pt-4">
            <form onSubmit={requestWithdraw} className="surface-card grid gap-3 p-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Jumlah (min. {rupiah(settings?.min_withdraw ?? 0)})</Label>
                <Input
                  id="amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="10000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-wallet</Label>
                <Select value={ewallet} onValueChange={setEwallet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih e-wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings?.ewallets ?? []).map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num">Nomor e-wallet</Label>
                <Input
                  id="num"
                  inputMode="numeric"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  maxLength={30}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holder">Nama pemilik</Label>
                <Input
                  id="holder"
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="Nama sesuai e-wallet"
                  maxLength={80}
                />
              </div>
              <Button type="submit" className="rounded-full sm:col-span-2" disabled={busy}>
                <Wallet className="size-4" /> Ajukan penarikan
              </Button>
            </form>

            <div className="surface-card divide-y divide-border overflow-hidden">
              {(withdrawals.data ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Belum ada penarikan.</p>
              )}
              {(withdrawals.data ?? []).map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{rupiah(w.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {w.ewallet} · {w.ewallet_number} · {w.ewallet_name}
                      {w.admin_note ? ` · ${w.admin_note}` : ""}
                    </p>
                  </div>
                  <StatusPill status={w.status} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="riwayat" className="space-y-4 pt-4">
            <div className="surface-card divide-y divide-border overflow-hidden">
              {history.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Belum ada riwayat.</p>
              )}
              {history.map((h) => (
                <div key={`${h.kind}-${h.id}`} className="space-y-1.5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{h.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.kind === "setor" ? "Setoran Gmail" : "Penarikan saldo"} ·{" "}
                        {new Date(h.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <StatusPill status={h.status} />
                  </div>
                  <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-semibold">
                      {h.status === "approved"
                        ? "Alasan diterima: "
                        : h.status === "rejected"
                          ? "Alasan ditolak: "
                          : "Catatan: "}
                    </span>
                    {h.admin_note
                      ? h.admin_note
                      : h.status === "pending"
                        ? "Sedang menunggu peninjauan admin."
                        : "Admin tidak menuliskan alasan."}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
