import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AiButton() {
  return (
    <Link
      to="/ai"
      style={{
        position: "fixed",
        bottom: 24,
        right: 20,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "linear-gradient(135deg, #E8611A, #C4511A)",
        borderRadius: 50,
        padding: "12px 18px",
        boxShadow: "0 4px 20px rgba(232,97,26,0.45)",
        color: "#fff",
        textDecoration: "none",
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      <Sparkles style={{ width: 18, height: 18 }} strokeWidth={2} />
      Nexcart AI
    </Link>
  );
}
