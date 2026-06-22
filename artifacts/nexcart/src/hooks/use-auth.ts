import { useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  const restoreForUser = useCart((s) => s.restoreForUser);

  useEffect(() => {
    // getUser() validates the token against the Supabase server.
    // getSession() only reads localStorage — it returns stale data for
    // previously logged-in users, which is the root cause of the
    // account-switching bug in Edge and Opera Mini.
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        // No valid session on server — wipe any stale local tokens
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) localStorage.removeItem(k);
          });
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) sessionStorage.removeItem(k);
          });
        } catch (_) {}
        setState({ user: null, session: null, loading: false });
        return;
      }
      supabase.auth.getSession().then(({ data: { session } }) => {
        setState({ user, session, loading: false });
        restoreForUser(user.id);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        try {
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) localStorage.removeItem(k);
          });
          Object.keys(sessionStorage).forEach((k) => {
            if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) sessionStorage.removeItem(k);
          });
        } catch (_) {}
        setState({ user: null, session: null, loading: false });
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        // Re-validate from server — never trust the cached session object alone
        supabase.auth.getUser().then(({ data: { user } }) => {
          setState({ user: user ?? session.user, session, loading: false });
          if (user) restoreForUser(user.id);
        });
        return;
      }
      setState({ user: session?.user ?? null, session, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
