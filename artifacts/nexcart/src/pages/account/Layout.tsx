import { useEffect } from "react";
import { useNavigate, useRouterState, Outlet } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Navbar } from "@/components/nexcart/Navbar";
import { CartDrawer } from "@/components/nexcart/CartDrawer";

export default function AccountLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB" }}>
      <Navbar />
      <CartDrawer />
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 48px", width: "100%", boxSizing: "border-box" }}>
        <Outlet />
      </main>
    </div>
  );
}
