import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Chrome } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/index";
import { Logo } from "@/components/nexcart/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (signUpError) throw signUpError;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        toast.success("Welcome back!");
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--gradient-hero-bg)" }}
    >
      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo className="scale-110" />
          <h1 className="text-xl font-extrabold text-white mt-1">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-white/50">
            {mode === "signin"
              ? "Sign in to continue shopping"
              : "Join Nexcart and start shopping smarter"}
          </p>
        </div>

        {/* Google */}
        <Button
          onClick={handleGoogle}
          disabled={loading}
          variant="outline"
          className="w-full mb-5 border-white/20 bg-white/10 text-white hover:bg-white/20 gap-2 font-semibold"
        >
          <Chrome className="h-4 w-4" />
          Continue with Google
        </Button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-transparent px-3 text-xs text-white/40">or continue with email</span>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs font-semibold">Full Name</Label>
              <Input
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-semibold">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-semibold">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="pl-9 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/20 border border-destructive/30 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-11 font-bold text-[oklch(0.14_0.06_75)] shadow-[var(--shadow-gold)] mt-1"
            style={{ background: "var(--gradient-gold)" }}
          >
            {loading
              ? "Please wait…"
              : mode === "signin"
              ? "Sign In"
              : "Create Account"}
          </Button>
        </div>

        {/* Toggle mode */}
        <p className="mt-6 text-center text-sm text-white/50">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="font-semibold text-primary hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
