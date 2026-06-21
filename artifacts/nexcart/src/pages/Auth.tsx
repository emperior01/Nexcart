import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

// ── Utility: fully wipe all Supabase auth data from browser storage ──────────
// Called before every Google OAuth start so no previous session bleeds through.
async function clearAuthSession(): Promise<void> {
  try {
    // scope: "global" = invalidate ALL sessions for this user on the server
    await supabase.auth.signOut({ scope: "global" });
  } catch (_) {}
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) localStorage.removeItem(k);
    });
  } catch (_) {}
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) sessionStorage.removeItem(k);
    });
  } catch (_) {}
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!email.trim() || !password) { setError("Please fill in all fields."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (mode === "signup" && !fullName.trim()) { setError("Please enter your full name."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (err) throw err;
        setSuccess("Account created! Check your email to confirm before signing in.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    setError(null);
    setSuccess(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/auth?mode=reset",
      });
      if (err) throw err;
      setSuccess("Password reset link sent! Check your email.");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);

    // ── Step 1: Fully clear any existing session before starting OAuth ───────
    // This is the fix for the account-switching bug in Edge / Opera Mini.
    // Without this, Supabase finds the old token in localStorage and returns
    // the previous user instead of the one chosen in the Google picker.
    await clearAuthSession();

    // ── Step 2: Start OAuth with prompt=select_account ───────────────────────
    // Forces Google to always show the account chooser screen, even if the
    // user only has one Google account signed in. This means switching
    // accounts (admin → another) always goes through the picker.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/",
        queryParams: {
          prompt: "select_account",   // always show account picker
          access_type: "online",      // don't request offline refresh token
        },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // If no error: browser redirects to Google — loading stays true until redirect
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(160deg,#1a1a1a 0%,#2e1a0e 60%,#3d2010 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em", textDecoration: "none" }}>
            <span style={{ color: "#E8611A" }}>Nex</span><span style={{ color: "#fff" }}>cart</span>
          </Link>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginTop: 8 }}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div className="flex rounded-xl p-1 mb-6" style={{ background: "rgba(255,255,255,0.08)" }}>
            {["signin", "signup"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: mode === m ? "#E8611A" : "transparent", color: mode === m ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white mb-4 transition-all"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", opacity: loading ? 0.6 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "Please wait…" : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
          </div>

          <div className="space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
              <input type={showPw ? "text" : "password"} placeholder="Password (min. 8 characters)"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full pl-10 pr-12 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }} />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.4)" }}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === "signin" && !forgotMode && (
              <div className="text-right">
                <button type="button" onClick={() => { setForgotMode(true); setError(null); setSuccess(null); }}
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer" }}>
                  Forgot password?
                </button>
              </div>
            )}
            {forgotMode && (
              <div className="space-y-3">
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
                  Enter your email and we'll send a reset link.
                </p>
                <button onClick={handleForgot} disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: loading ? "rgba(232,97,26,0.6)" : "#E8611A" }}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </button>
                <button type="button" onClick={() => { setForgotMode(false); setError(null); setSuccess(null); }}
                  style={{ width: "100%", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", marginTop: 4 }}>
                  Back to sign in
                </button>
              </div>
            )}
            {error && (
              <div className="rounded-xl px-4 py-3 text-xs text-red-300"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}>
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-xl px-4 py-3 text-xs text-green-300"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}>
                {success}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: loading ? "rgba(232,97,26,0.6)" : "#E8611A", fontFamily: "'Inter',sans-serif" }}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>
        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.35)" }}>
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
