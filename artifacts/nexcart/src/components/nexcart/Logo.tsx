import { Link } from "@tanstack/react-router";

export function Logo({ className = "", height = 52 }: { className?: string; height?: number }) {
  return (
    <Link to="/" className={`flex items-center ${className}`} style={{ textDecoration: "none" }}>
      <img
        src="/logo.png"
        alt="Nexcart"
        style={{ height, width: "auto", objectFit: "contain" }}
      />
    </Link>
  );
}
