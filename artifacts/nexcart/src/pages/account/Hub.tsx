import { Link } from "@tanstack/react-router";
import { User, Package, Heart, MapPin, Settings, LogOut, ChevronRight, LayoutDashboard, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/hooks/use-wishlist";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

const MENU_ITEMS = [
  {
    to: "/account/profile",
    label: "My Profile",
    desc: "Name, email, phone, password",
    icon: User,
  },
  {
    to: "/account/orders",
    label: "My Orders",
    desc: "Order history and tracking",
    icon: Package,
  },
  {
    to: "/account/wishlist",
    label: "Wishlist",
    desc: "Saved products",
    icon: Heart,
  },
  {
    to: "/account/addresses",
    label: "Addresses",
    desc: "Manage delivery addresses",
    icon: MapPin,
  },
  {
    to: "/account/settings",
    label: "Settings",
    desc: "Currency, notifications and preferences",
    icon: Settings,
  },
  {
    to: "/account/payment-settings",
    label: "Preferred Payment",
    desc: "Set your checkout payment preference",
    icon: CreditCard,
  },
] as const;

export default function AccountHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { count: wishlistCount } = useWishlist();
  const [isAdmin, setIsAdmin] = useState(false);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setFullName((data as { full_name: string | null }).full_name ?? "");
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const { data: ordersCount } = useQuery({
    queryKey: ["orders-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    void navigate({ to: "/" });
  }

  const displayName = fullName || user?.email?.split("@")[0] || "User";
  const initials = ((fullName?.[0] ?? user?.email?.[0] ?? "?")).toUpperCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* User identity card */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #EBEBEB",
        padding: "20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}>
        <div style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "linear-gradient(135deg,#E8611A,#C4511A)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 20,
          fontWeight: 800,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: "#0D0D0D", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </p>
          <p style={{ fontSize: 13, color: "#6B7280", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email}
          </p>
        </div>
        <div style={{ display: "flex", gap: 24, flexShrink: 0 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: "#0D0D0D", margin: 0 }}>{ordersCount ?? 0}</p>
            <p style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 500, margin: "2px 0 0" }}>Orders</p>
          </div>
          <div style={{ width: 1, background: "#F0F0F0" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: "#0D0D0D", margin: 0 }}>{wishlistCount}</p>
            <p style={{ fontSize: 11, color: "#9B9B9B", fontWeight: 500, margin: "2px 0 0" }}>Saved</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div style={{
        background: "#FFFFFF",
        borderRadius: 16,
        border: "1px solid #EBEBEB",
        overflow: "hidden",
      }}>
        {MENU_ITEMS.map(({ to, label, desc, icon: Icon }, index) => (
          <Link
            key={to}
            to={to}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 18px",
              textDecoration: "none",
              borderBottom: index < MENU_ITEMS.length - 1 ? "1px solid #F5F5F5" : "none",
              background: "#FFFFFF",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon style={{ width: 17, height: 17, color: "#6B7280" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, color: "#9B9B9B", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</p>
            </div>
            <ChevronRight style={{ width: 16, height: 16, color: "#D1D5DB", flexShrink: 0 }} />
          </Link>
        ))}
      </div>

      {/* Admin panel — only visible to admins */}
      {isAdmin && (
        <div style={{
          background: "#FFFFFF",
          borderRadius: 16,
          border: "1px solid #EBEBEB",
          overflow: "hidden",
        }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 18px",
              textDecoration: "none",
              background: "#FFFFFF",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAFA")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <LayoutDashboard style={{ width: 17, height: 17, color: "#6B7280" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", margin: 0 }}>Admin Dashboard</p>
              <p style={{ fontSize: 12, color: "#9B9B9B", margin: "2px 0 0" }}>Seller tools and management</p>
            </div>
            <ChevronRight style={{ width: 16, height: 16, color: "#D1D5DB", flexShrink: 0 }} />
          </Link>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "14px",
          borderRadius: 16,
          border: "1px solid #FECACA",
          background: "#FFFFFF",
          color: "#EF4444",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF2F2")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
      >
        <LogOut style={{ width: 16, height: 16 }} />
        Sign Out
      </button>

    </div>
  );
}
