import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MessageCircle, ShieldCheck, Wallet, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { rupiah, settingsQuery } from "@/lib/app-data";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Setor Gmail — Tukar Akun Gmail Jadi Saldo E-Wallet" },
      {
        name: "description",
        content:
          "Setorkan alamat Gmail aktif kamu, pantau saldo secara real-time, dan tarik dananya ke DANA, OVO, GoPay, atau ShopeePay.",
      },
      { property: "og:title", content: "Setor Gmail — Tukar Akun Gmail Jadi Saldo E-Wallet" },
      {
        property: "og:description",
        content: "Setor alamat Gmail, pantau saldo, dan tarik dana ke e-wallet dengan proses cepat.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: settings } = useQuery(settingsQuery);
  const { user } = useAuth();

  const brand = settings?.brand_name ?? "Setor Gmail";
  const wa = settings?.whatsapp ?? "6287796701732";

  return (
    <div className="min-h-screen bg-sky">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-primary-foreground">
            <Mail className="size-4" />
          </span>
          <span className="text-lg font-extrabold">{brand}</span>
        </div>
        <Button asChild size="sm" className="rounded-full">
          <Link to={user ? "/dashboard" : "/auth"}>{user ? "Dashboard" : "Masuk"}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="pt-8 pb-14 text-center sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            Tanpa kata sandi — cukup alamat Gmail
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-extrabold sm:text-6xl">
            Tukar alamat Gmail
            <br />
            jadi saldo e-wallet
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {settings?.tagline ?? "Setor alamat Gmail, pantau saldo, dan tarik dana ke e-wallet."}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full rounded-full sm:w-auto">
              <Link to={user ? "/dashboard" : "/auth"}>
                {user ? "Buka Dashboard" : "Masuk atau Daftar"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full rounded-full sm:w-auto">
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                WhatsApp Admin
              </a>
            </Button>
          </div>

          {(settings?.whatsapp_group || settings?.whatsapp_channel) && (
            <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {settings?.whatsapp_group ? (
                <Button asChild variant="ghost" size="lg" className="w-full rounded-full sm:w-auto">
                  <a href={settings.whatsapp_group} target="_blank" rel="noreferrer">
                    <Users className="size-4" />
                    Grup WhatsApp
                  </a>
                </Button>
              ) : null}
              {settings?.whatsapp_channel ? (
                <Button asChild variant="ghost" size="lg" className="w-full rounded-full sm:w-auto">
                  <a href={settings.whatsapp_channel} target="_blank" rel="noreferrer">
                    <Radio className="size-4" />
                    Channel WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          )}

          {settings?.announcement ? (
            <p className="mx-auto mt-8 max-w-xl rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              {settings.announcement}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Mail,
              title: "Setor alamat Gmail",
              body: "Kirim alamat Gmail aktif milikmu. Kami tidak pernah meminta kata sandi.",
            },
            {
              icon: ShieldCheck,
              title: "Diverifikasi admin",
              body: "Setiap setoran ditinjau manual. Status tampil transparan di dashboard.",
            },
            {
              icon: Wallet,
              title: "Cairkan ke e-wallet",
              body: `Tarik saldo mulai ${rupiah(settings?.min_withdraw ?? 10000)} ke ${(settings?.ewallets ?? ["DANA"]).join(", ")}.`,
            },
          ].map((item) => (
            <div key={item.title} className="surface-card p-6 text-left">
              <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <item.icon className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-bold">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="surface-card mt-6 flex flex-col items-center gap-4 p-7 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-sm text-muted-foreground">Harga per akun Gmail disetujui</p>
            <p className="text-3xl font-extrabold text-primary">
              {rupiah(settings?.price_per_account ?? 3000)}
            </p>
          </div>
          <Button asChild className="rounded-full">
            <Link to={user ? "/dashboard" : "/auth"}>Mulai setor sekarang</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {brand}. Semua hak dilindungi.
      </footer>
    </div>
  );
}
