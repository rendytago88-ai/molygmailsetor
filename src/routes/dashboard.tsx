import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { LogOut, Mail, Plus, Shield, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["deposits"] });
    qc.invalidateQueries({ queryKey: ["withdrawals"] });
  };

  async function addDeposit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = gmailSchema.safeParse(gmail);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Alamat tidak valid");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("gmail_deposits").insert({
      user_id: user!.id,
      gmail_address: parsed.data,
      price: settings?.price_per_account ?? 0,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Alamat Gmail ini sudah pernah disetor" : error.message);
      return;
    }
    setGmail("");
    toast.success("Setoran terkirim, menunggu verifikasi admin");
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

  const depositsOpen = settings?.deposits_open ?? true;

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
          </TabsList>

          <TabsContent value="setor" className="space-y-4 pt-4">
            <form onSubmit={addDeposit} className="surface-card space-y-3 p-6">
              <Label htmlFor="gmail">Alamat Gmail</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="gmail"
                  type="email"
                  value={gmail}
                  onChange={(e) => setGmail(e.target.value)}
                  placeholder="namakamu@gmail.com"
                  disabled={!depositsOpen}
                  maxLength={255}
                />
                <Button type="submit" className="rounded-full" disabled={busy || !depositsOpen}>
                  <Plus className="size-4" /> Setor
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {depositsOpen ? settings?.rules : "Setoran sedang ditutup sementara oleh admin."}
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
        </Tabs>
      </main>
    </div>
  );
}
