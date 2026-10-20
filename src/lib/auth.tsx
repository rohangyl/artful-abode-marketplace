import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = { user: User | null; isAdmin: boolean; loading: boolean };
const Ctx = createContext<AuthCtx>({ user: null, isAdmin: false, loading: true });

export function AuthProvider({ children, onChange }: { children: ReactNode; onChange?: () => void }) {
  const [state, setState] = useState<AuthCtx>({ user: null, isAdmin: false, loading: true });

  useEffect(() => {
    const load = async (user: User | null) => {
      let isAdmin = false;
      if (user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
        isAdmin = !!data;
      }
      setState({ user, isAdmin, loading: false });
    };
    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      load(session?.user ?? null);
      onChange?.();
    });
    return () => sub.subscription.unsubscribe();
  }, [onChange]);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
