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
    // ── Initial load ────────────────────────────────────────────────────────
    // ALWAYS use getUser() here, NOT getSession().
    // getSession() reads from localStorage and can return a stale session from
    // a previously logged-in user (the root cause of the account-switching bug).
    // getUser() hits the Supabase server and validates the token is still live.
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        // No valid server-side session — wipe any stale local tokens
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
      // Valid user — also grab the session object for consumers that need it
      supabase.auth.getSession().then(({ data: { session } }) => {
        setState({ user, session, loading: false });
        restoreForUser(user.id);
      });
    });

    // ── Auth state changes ───────────────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Belt-and-suspenders: clear storage here too in case caller forgot
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
        // Re-fetch the user from the server so we NEVER trust a cached profile
        supabase.auth.getUser().then(({ data: { user } }) => {
          setState({ user: user ?? session.user, session, loading: false });
          if (user) restoreForUser(user.id);
        });
        return;
      }

      // TOKEN_REFRESHED, INITIAL_SESSION, etc.
      setState({ user: session?.user ?? null, session, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
