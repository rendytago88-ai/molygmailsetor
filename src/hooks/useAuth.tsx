import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    supabase
      .from("profiles")
      .select("banned, banned_reason")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { banned?: boolean; banned_reason?: string } | null;
        if (!active || !row?.banned) return;
        toast.error(
          row.banned_reason
            ? `Akun kamu diblokir admin. Alasan: ${row.banned_reason}`
            : "Akun kamu diblokir admin.",
        );
        void supabase.auth.signOut();
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return { session, user: (session?.user ?? null) as User | null, loading };
}


export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setIsAdmin(null);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return isAdmin;
}
