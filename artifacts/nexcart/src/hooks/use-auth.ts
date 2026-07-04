import { useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

// A genuine "your session is invalid" response from Supabase's server has a
// real HTTP status (401/403). A missing/undefined status means the request
// itself failed — network hiccup, timeout, cold start — which says nothing
// about whether the session is actually still valid. Wiping tokens on that
// kind of transient failure is what was causing unexpected logouts: a
// single slow request was enough to nuke a perfectly good session.
function isGenuineAuthRejection(error: AuthError | null): boolean {
  if (!error) return false;
  const status = (error as { status?: number }).status;
  return status === 401 || status === 403;
}

function wipeSupabaseTokens() {
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) localStorage.removeItem(k);
    });
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) sessionStorage.removeItem(k);
    });
  } catch (_) {
    // ignore
  }
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
      if (isGenuineAuthRejection(error)) {
        // The server explicitly rejected this token — genuinely signed out.
        wipeSupabaseTokens();
        setState({ user: null, session: null, loading: false });
        return;
      }
      if (error || !user) {
        // Couldn't confirm via the server (network error, timeout, cold
        // start, etc — not a genuine rejection, that's handled above).
        // Falling back to getSession() here matters a lot in practice:
        // this exact path fires right after a fresh login, when the
        // homepage re-mounts this hook and immediately re-validates. If
        // that second check hiccups, leaving `user` at its default of
        // null makes a freshly-logged-in person look logged out even
        // though their tokens are perfectly intact. getSession() only
        // reads localStorage — no network call, can't fail this way —
        // so it's a safe, honest fallback: it reflects "here's what we
        // have locally" rather than "we don't know, so assume logged out."
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setState({ user: session.user, session, loading: false });
            restoreForUser(session.user.id);
          } else {
            setState((prev) => ({ ...prev, loading: false }));
          }
        });
        return;
      }
      supabase.auth.getSession().then(({ data: { session } }) => {
        setState({ user, session, loading: false });
        restoreForUser(user.id);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        wipeSupabaseTokens();
        setState({ user: null, session: null, loading: false });
        return;
      }
      if (event === "SIGNED_IN" && session?.user) {
        // Re-validate from server — never trust the cached session object
        // alone. But again: only treat a genuine rejection as sign-out.
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (isGenuineAuthRejection(error)) {
            wipeSupabaseTokens();
            setState({ user: null, session: null, loading: false });
            return;
          }
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
