import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2045c0-.638-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.567 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8064.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5836-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71C3.7845 10.17 3.6818 9.5932 3.6818 9s.1027-1.17.2822-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1632 6.656 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);

  function switchMode(m: "signin" | "signup") {
    setMode(m);
    setError(null);
    setSuccess(null);
    setForgotMode(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError(null);

    // Clear any existing Supabase session before starting OAuth.
    // Without this, Edge/Opera Mini reuse the cached session from the last
    // logged-in user and skip the Google account picker entirely.
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch (_) {}
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) localStorage.removeItem(k);
      });
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("sb-") || k.toLowerCase().includes("supabase")) sessionStorage.removeItem(k);
      });
    } catch (_) {}

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          prompt: "select_account", // always show Google account picker
          access_type: "online",
        },
      },
    });
    if (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
    // No setGoogleLoading(false) on success — browser is redirecting to Google
  }

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!forgotMode && !password) { setError("Please enter your password."); return; }
    if (!forgotMode && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (mode === "signup" && !forgotMode && !fullName.trim()) { setError("Please enter your full name."); return; }
    setLoading(true);
    try {
      if (forgotMode) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (err) throw err;
        setSuccess("Reset link sent! Check your inbox.");
      } else if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (err) throw err;
        setSuccess("Account created! Check your email to confirm.");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;

        // Establish the secure server-side session (nex_session cookie)
        // alongside Supabase's own client session. Best-effort and
        // non-blocking: if this fails, the user is still fully logged in
        // via the existing Supabase auth — this only powers the newer
        // security features (logout-everywhere, checkout session tracking),
        // it isn't load-bearing for the app's normal RLS-authenticated data
        // access.
        //
        // NOTE: we deliberately do NOT merge `guestCartItems` from the
        // response back into the cart store here. The client-side cart
        // (cart.ts) is already continuous across login — whatever you
        // added as a guest is already sitting in it, since that's the same
        // localStorage-backed store regardless of auth state. Re-adding
        // the server's guest-cart copy on top double-counted quantities.
        // The server still deletes its guest cart row/cookie for cleanup;
        // the response body just isn't used for anything client-side.
        try {
          await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email: email.trim(), password }),
          });
        } catch (_) {
          // Non-fatal — see comment above.
        }

        toast.success("Welcome back!");
        void navigate({ to: "/" });
      }
    } catch (err) {
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    padding: "14px 14px 14px 42px",
    fontSize: 14,
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "linear-gradient(160deg,#1a1100 0%,#1e1208 40%,#0d0d0d 100%)" }}
    >
      {/* Logo */}
      <div className="mb-6 text-center">
        <div className="text-[32px] font-extrabold tracking-[-0.03em] leading-none mb-2" style={{ fontFamily: "'Inter',sans-serif" }}>
          <span style={{ color: "#E8611A" }}>Nex</span><span style={{ color: "#fff" }}>cart</span>
        </div>
        <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          {forgotMode ? "Reset your password" : mode === "signin" ? "Welcome back" : "Create an account"}
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[360px] rounded-[20px] p-5"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
      >
        {/* Tabs */}
        {!forgotMode && (
          <div
            className="flex rounded-xl p-1 mb-5"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold transition-all"
                style={
                  mode === m
                    ? { background: "#E8611A", color: "#fff" }
                    : { color: "rgba(255,255,255,0.45)" }
                }
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}

        {/* Google button */}
        {!forgotMode && (
          <>
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60 mb-4"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff", cursor: googleLoading ? "not-allowed" : "pointer" }}
            >
              <GoogleIcon />
              {googleLoading ? (
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  style={{ animation: "nx-spin 0.75s linear infinite", flexShrink: 0 }}
                >
                  <style>{`@keyframes nx-spin { to { transform: rotate(360deg); } }`}</style>
                  <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" />
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              ) : (
                <span>Continue with Google</span>
              )}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>
          </>
        )}

        {/* Fields */}
        <div className="space-y-3">
          {mode === "signup" && !forgotMode && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#E8611A")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.35)" }} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder="Email address"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "#E8611A")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>

          {!forgotMode && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.35)" }} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                placeholder="Password (min. 8 characters)"
                style={{ ...inputStyle, paddingRight: 42 }}
                onFocus={(e) => (e.target.style.borderColor = "#E8611A")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-50"
                style={{ color: "#fff" }}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Forgot password hint */}
        {forgotMode && (
          <p className="text-[13px] mt-1 mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Enter your email and we'll send a reset link.
          </p>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "rgba(220,38,38,0.18)", border: "1px solid rgba(220,38,38,0.35)", color: "#FCA5A5" }}
          >
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            className="mt-3 rounded-xl px-4 py-3 text-[13px]"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#86EFAC" }}
          >
            {success}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-4 py-3.5 rounded-xl text-white text-[14px] font-bold transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "#E8611A" }}
        >
          {loading
            ? "Please wait…"
            : forgotMode
              ? "Send Reset Link"
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
        </button>

        {/* Forgot / Back links */}
        {!forgotMode && mode === "signin" && (
          <button
            className="w-full mt-3 text-[13px] transition-colors hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onClick={() => { setForgotMode(true); setError(null); setSuccess(null); }}
          >
            Forgot password?
          </button>
        )}
        {forgotMode && (
          <button
            className="w-full mt-3 text-[13px] transition-colors hover:opacity-80"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onClick={() => { setForgotMode(false); setError(null); setSuccess(null); }}
          >
            Back to sign in
          </button>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-[12px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        By continuing you agree to our{" "}
        <span className="underline cursor-pointer hover:opacity-80">Terms</span>
        {" & "}
        <span className="underline cursor-pointer hover:opacity-80">Privacy Policy</span>
      </p>
    </div>
  );
}
