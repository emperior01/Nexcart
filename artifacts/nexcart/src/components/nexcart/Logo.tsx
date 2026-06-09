import { Link } from "wouter";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center ${className}`} style={{ textDecoration: "none" }}>
      <img
        src="/logo.png"
        alt="Nexcart"
        style={{ height: 36, width: "auto", objectFit: "contain" }}
      />
    </Link>
  );
}
