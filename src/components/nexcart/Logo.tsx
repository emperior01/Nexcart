import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      className={`font-display text-[22px] font-extrabold tracking-[-0.03em] leading-none ${className}`}
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      <span style={{ color: "#E8611A" }}>Nex</span>
      <span style={{ color: "#0D0D0D" }}>cart</span>
    </Link>
  );
}
