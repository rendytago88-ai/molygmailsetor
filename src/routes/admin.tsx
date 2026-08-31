import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Save, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  type SiteSettings,
  type Status,
  type Withdrawal,
} from "@/lib/app-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Panel Admin — Setor Gmail" },
      { name: "description", content: "Kelola setoran, penarikan, pengguna, dan pengaturan situs." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Panel Admin — Setor Gmail" },
      { property: "og:description", content: "Kelola setoran, penarikan, pengguna, dan pengaturan situs." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin(user?.id);
  const { data: settings } = useQuery(settingsQuery);
  const [form, setForm] = useState<SiteSettings | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isAdmin === false) navigate({ to: "/dashboard" });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  const deposits = useQuery({
    queryKey: ["admin-deposits"],
    enabled: isAdmin === true,
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
    queryKey: ["admin-withdrawals"],
    enabled: isAdmin === true,
    queryFn: async (): Promise<Withdrawal[]> => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Withdrawal[];
    },
  });

  const users = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin === true,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Profile[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-deposits"] });
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  async function setDepositStatus(id: string, status: Status) {
    const { error } = await supabase
      .from("gmail_deposits")
      .update({ status, admin_note: (notes[id] ?? "").slice(0, 300) })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Setoran ${statusLabel[status].toLowerCase()}`);
    refresh();
  }

  async function setWithdrawStatus(id: string, status: Status) {
    const { error } = await supabase
      .from("withdrawals")
      .update({ status, admin_note: (notes[id] ?? "").slice(0, 300) })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Penarikan ${statusLabel[status].toLowerCase()}`);
    refresh();
  }

  async function removeDeposit(id: string) {
    const { error } = await supabase.from("gmail_deposits").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  async function saveSettings() {
    if (!form) return;
    const { error } = await supabase
      .from("site_settings")
      .update({
        brand_name: form.brand_name.slice(0, 60),
        tagline: form.tagline.slice(0, 200),
        whatsapp: form.whatsapp.replace(/\D/g, "").slice(0, 20),
        price_per_account: Number(form.price_per_account) || 0,
        min_withdraw: Number(form.min_withdraw) || 0,
        ewallets: form.ewallets,
        announcement: form.announcement.slice(0, 300),
        rules: form.rules.slice(0, 2000),
        rules_title: form.rules_title.slice(0, 80),
        general: form.general.slice(0, 2000),
        general_title: form.general_title.slice(0, 80),
        whatsapp_group: form.whatsapp_group.trim().slice(0, 300),
        whatsapp_channel: form.whatsapp_channel.trim().slice(0, 300),
        deposits_open: form.deposits_open,
      })
      .eq("id", 1);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pengaturan disimpan");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
  }

  if (loading || isAdmin === null || !form) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat…</div>;
  }

  const nameOf = (id: string) =>
    users.data?.find((u) => u.id === id)?.email ?? users.data?.find((u) => u.id === id)?.full_name ?? "Pengguna";

  return (
    <div className="min-h-screen bg-sky pb-16">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <span className="text-sm font-extrabold">Panel Pemilik</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pt-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="surface-card p-5">
            <p className="text-sm text-muted-foreground">Setoran menunggu</p>
            <p className="text-3xl font-extrabold">
              {(deposits.data ?? []).filter((d) => d.status === "pending").length}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm text-muted-foreground">Penarikan menunggu</p>
            <p className="text-3xl font-extrabold">
              {(withdrawals.data ?? []).filter((w) => w.status === "pending").length}
            </p>
          </div>
          <div className="surface-card p-5">
            <p className="text-sm text-muted-foreground">Total pengguna</p>
            <p className="text-3xl font-extrabold">{users.data?.length ?? 0}</p>
          </div>
        </div>

        <Tabs defaultValue="deposits">
          <TabsList className="w-full">
            <TabsTrigger value="deposits" className="flex-1">
              Setoran
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex-1">
              Penarikan
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-1">
              Pengguna
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              Pengaturan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposits" className="pt-4">
            <div className="surface-card divide-y divide-border overflow-hidden">
              {(deposits.data ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Belum ada setoran.</p>
              )}
              {(deposits.data ?? []).map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.gmail_address}</p>
                    <p className="text-xs text-muted-foreground">
                      {nameOf(d.user_id)} · {rupiah(d.price)} ·{" "}
                      {new Date(d.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[d.status]}`}>
                      {statusLabel[d.status]}
                    </span>
                    <Button size="icon" variant="outline" onClick={() => setDepositStatus(d.id, "approved")}>
                      <Check className="size-4 text-success" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setDepositStatus(d.id, "rejected")}>
                      <X className="size-4 text-destructive" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => removeDeposit(d.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="w-full">
                    <Input
                      value={notes[d.id] ?? d.admin_note ?? ""}
                      onChange={(e) => setNotes({ ...notes, [d.id]: e.target.value })}
                      placeholder="Alasan diterima / ditolak (tampil ke pengguna)"
                      maxLength={300}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="withdrawals" className="pt-4">
            <div className="surface-card divide-y divide-border overflow-hidden">
              {(withdrawals.data ?? []).length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Belum ada penarikan.</p>
              )}
              {(withdrawals.data ?? []).map((w) => (
                <div key={w.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{rupiah(w.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nameOf(w.user_id)} · {w.ewallet} {w.ewallet_number} a/n {w.ewallet_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone[w.status]}`}>
                      {statusLabel[w.status]}
                    </span>
                    <Button size="icon" variant="outline" onClick={() => setWithdrawStatus(w.id, "approved")}>
                      <Check className="size-4 text-success" />
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setWithdrawStatus(w.id, "rejected")}>
                      <X className="size-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="w-full">
                    <Input
                      value={notes[w.id] ?? w.admin_note ?? ""}
                      onChange={(e) => setNotes({ ...notes, [w.id]: e.target.value })}
                      placeholder="Alasan diterima / ditolak (tampil ke pengguna)"
                      maxLength={300}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="pt-4">
            <div className="surface-card divide-y divide-border overflow-hidden">
              {(users.data ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.full_name ?? "Tanpa nama"}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{rupiah(u.balance)}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="pt-4">
            <div className="surface-card grid gap-4 p-6 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nama brand</Label>
                <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Nomor WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Harga per akun (Rp)</Label>
                <Input
                  inputMode="numeric"
                  value={String(form.price_per_account)}
                  onChange={(e) =>
                    setForm({ ...form, price_per_account: Number(e.target.value.replace(/\D/g, "")) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Minimal penarikan (Rp)</Label>
                <Input
                  inputMode="numeric"
                  value={String(form.min_withdraw)}
                  onChange={(e) => setForm({ ...form, min_withdraw: Number(e.target.value.replace(/\D/g, "")) })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>E-wallet (pisahkan dengan koma)</Label>
                <Input
                  value={form.ewallets.join(", ")}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ewallets: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Pengumuman</Label>
                <Textarea
                  value={form.announcement}
                  onChange={(e) => setForm({ ...form, announcement: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link grup WhatsApp</Label>
                <Input
                  value={form.whatsapp_group}
                  onChange={(e) => setForm({ ...form, whatsapp_group: e.target.value })}
                  placeholder="https://chat.whatsapp.com/..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link channel WhatsApp</Label>
                <Input
                  value={form.whatsapp_channel}
                  onChange={(e) => setForm({ ...form, whatsapp_channel: e.target.value })}
                  placeholder="https://whatsapp.com/channel/..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Judul informasi umum</Label>
                <Input
                  value={form.general_title}
                  onChange={(e) => setForm({ ...form, general_title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Informasi umum (general)</Label>
                <Textarea
                  value={form.general}
                  onChange={(e) => setForm({ ...form, general: e.target.value })}
                  rows={5}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Judul aturan</Label>
                <Input
                  value={form.rules_title}
                  onChange={(e) => setForm({ ...form, rules_title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Aturan / syarat & ketentuan</Label>
                <Textarea
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                  rows={6}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4 sm:col-span-2">
                <div>
                  <p className="text-sm font-semibold">Buka setoran</p>
                  <p className="text-xs text-muted-foreground">Matikan untuk menghentikan setoran baru.</p>
                </div>
                <Switch
                  checked={form.deposits_open}
                  onCheckedChange={(v) => setForm({ ...form, deposits_open: v })}
                />
              </div>
              <Button className="rounded-full sm:col-span-2" onClick={saveSettings}>
                <Save className="size-4" /> Simpan pengaturan
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
