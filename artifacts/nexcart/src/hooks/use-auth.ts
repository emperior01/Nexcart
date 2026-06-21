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
    // Use getUser() instead of getSession() — getSession() reads from localStorage
    // and can return a stale session belonging to a previously logged-in user.
    // getUser() always validates against the Supabase server.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setState({ user, session, loading: false });
          restoreForUser(user.id);
        });
      } else {
        setState({ user: null, session: null, loading: false });
      }
    });

    // Listen for auth state changes — events are always fresh from the server
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Clear ALL Supabase-related localStorage keys so no stale tokens linger
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("sb-") || key.includes("supabase")) {
            localStorage.removeItem(key);
          }
        });
        setState({ user: null, session: null, loading: false });
        return;
      }
      setState({ user: session?.user ?? null, session, loading: false });
      if (event === "SIGNED_IN" && session?.user) {
        restoreForUser(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
