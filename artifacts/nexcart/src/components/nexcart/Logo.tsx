import { Link } from "@tanstack/react-router";

export function Logo({ className = "", height = 44 }: { className?: string; height?: number }) {
  return (
    <Link to="/" className={`flex items-center ${className}`} style={{ textDecoration: "none" }}>
      <img
        src="/logo-cropped.png"
        alt="Nexcart"
        style={{ height, width: "auto", objectFit: "contain", display: "block" }}
      />
    </Link>
  );
}
