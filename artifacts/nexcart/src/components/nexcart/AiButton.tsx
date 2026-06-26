import { Sparkles } from "lucide-react";

interface AiButtonProps {
  onClick: () => void;
}

export function AiButton({ onClick }: AiButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Open Nexcart AI Shopping Assistant"
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
        fontWeight: 700,
        fontSize: 14,
        border: "none",
        cursor: "pointer",
      }}
    >
      <Sparkles style={{ width: 18, height: 18 }} strokeWidth={2} />
      Nexcart AI
    </button>
  );
}
