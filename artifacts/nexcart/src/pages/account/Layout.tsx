import { useEffect } from "react";
import { Link, useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const PAGE_TITLES: Record<string, string> = {
  "/account/profile":          "My Profile",
  "/account/orders":           "My Orders",
  "/account/wishlist":         "Wishlist",
  "/account/addresses":        "Addresses",
  "/account/settings":         "Settings",
  "/account/payment-settings": "Preferred Payment",
};

export default function AccountLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F9FAFB" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #E8611A", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isHub = pathname === "/account" || pathname === "/account/";
  const pageTitle = PAGE_TITLES[pathname] ?? "Account";

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <header style={{ background: "#FFFFFF", borderBottom: "1px solid #EBEBEB", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 16px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          {!isHub && (
            <Link to="/account" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "#F3F4F6", flexShrink: 0, color: "#3A3A3A", textDecoration: "none" }}>
              <ChevronLeft style={{ width: 18, height: 18 }} />
            </Link>
          )}
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 16, color: "#0D0D0D", letterSpacing: "-0.02em" }}>
            {isHub ? "My Account" : pageTitle}
          </span>
        </div>
      </header>
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 48px", width: "100%", boxSizing: "border-box" }}>
        <Outlet />
      </main>
    </div>
  );
}
