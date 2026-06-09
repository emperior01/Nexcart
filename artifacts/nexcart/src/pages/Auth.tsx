import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Mail, Lock, Eye, EyeOff, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSuccess(null);
    if (!email.trim() || (!forgotMode && !password)) { setError("Please fill in all fields."); return; }
    if (!forgotMode && password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (mode === "signup" && !fullName.trim()) { setError("Please enter your full name."); return; }
    setLoading(true);
    try {
      if (forgotMode) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (err) throw err;
        setSuccess("Check your email for a password reset link.");
      } else if (mode === "signup") {
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
      setError((err as Error).message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ background: "linear-gradient(160deg,#1a1a1a 0%,#2e1a0e 60%,#3d2010 100%)" }}
    >
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="inline-block text-[32px] font-extrabold tracking-[-0.03em] text-[#E8611A] mb-2"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Nexcart
          </span>
          <p className="text-sm text-white/50">
            {forgotMode ? "Reset your password" : mode === "signin" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-2xl">
          {!forgotMode && (
            <div className="flex rounded-xl bg-[#F4F4F4] p-1 mb-6">
              {["signin", "signup"].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                  className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
                  style={mode === m ? { background: "#fff", color: "#0D0D0D", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" } : { color: "#6B6B6B" }}
                >
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {mode === "signup" && !forgotMode && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-[0.08em]">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E5E7EB] text-[14px] outline-none focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-[0.08em]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-[#E5E7EB] text-[14px] outline-none focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 transition-all"
                />
              </div>
            </div>

            {!forgotMode && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-[#6B6B6B] uppercase tracking-[0.08em]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-3 rounded-xl border border-[#E5E7EB] text-[14px] outline-none focus:border-[#E8611A] focus:ring-2 focus:ring-[#E8611A]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B6B6B]"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-[13px] text-green-700">
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-5 py-3.5 rounded-full text-white text-[14px] font-bold transition-all hover:opacity-90 disabled:opacity-60"
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

          {!forgotMode && mode === "signin" && (
            <button
              className="w-full mt-3 text-[13px] text-[#6B6B6B] hover:text-[#E8611A] transition-colors"
              onClick={() => { setForgotMode(true); setError(null); setSuccess(null); }}
            >
              Forgot password?
            </button>
          )}

          {forgotMode && (
            <button
              className="w-full mt-3 text-[13px] text-[#6B6B6B] hover:text-[#E8611A] transition-colors"
              onClick={() => { setForgotMode(false); setError(null); setSuccess(null); }}
            >
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
