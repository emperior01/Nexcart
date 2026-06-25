import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AiButton() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const hidden =
    pathname === "/ai" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seller");

  if (hidden) return null;

  return (
    <button
      onClick={() => void navigate({ to: "/ai" })}
      aria-label="Open Nexcart AI Shopping Assistant"
      className="fixed z-40 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
      style={{
        bottom: 24,
        right: 20,
        background: "linear-gradient(135deg, #E8611A, #C4511A)",
        borderRadius: 50,
        padding: "12px 18px",
        boxShadow: "0 4px 20px rgba(232,97,26,0.45)",
        color: "#fff",
      }}
    >
      <Sparkles style={{ width: 18, height: 18 }} strokeWidth={2} />
      <span className="text-sm font-bold tracking-tight">Nexcart AI</span>
    </button>
  );
}
