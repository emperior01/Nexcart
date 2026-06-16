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
    color: "#6366F1",
    bg: "#EEF2FF",
  },
  {
    to: "/account/orders",
    label: "My Orders",
    desc: "Order history and status",
    icon: Package,
    color: "#3B82F6",
    bg: "#EFF6FF",
  },
  {
    to: "/account/wishlist",
    label: "Wishlist",
    desc: "Saved products",
    icon: Heart,
    color: "#EC4899",
    bg: "#FDF2F8",
  },
  {
    to: "/account/addresses",
    label: "Addresses",
    desc: "Manage delivery addresses",
    icon: MapPin,
    color: "#10B981",
    bg: "#ECFDF5",
  },
  {
    to: "/account/settings",
    label: "Settings",
    desc: "Currency and preferences",
    icon: Settings,
    color: "#6B7280",
    bg: "#F9FAFB",
  },
  {
    to: "/account/payment-settings",
    label: "Payment Settings",
    desc: "View accepted payment methods",
    icon: CreditCard,
    color: "#E8611A",
    bg: "#FEF0E8",
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
    <div className="space-y-5">
      {/* User card */}
      <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5 shadow-sm flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-[#0D0D0D] text-base truncate">{displayName}</p>
          <p className="text-sm text-[#6B7280] truncate">{user?.email}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="font-extrabold text-[#0D0D0D] text-lg">{ordersCount ?? 0}</p>
            <p className="text-[11px] text-[#9B9B9B] font-medium">Orders</p>
          </div>
          <div className="w-px h-8 bg-[#F0F0F0]" />
          <div className="text-center">
            <p className="font-extrabold text-[#0D0D0D] text-lg">{wishlistCount}</p>
            <p className="text-[11px] text-[#9B9B9B] font-medium">Wishlist</p>
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MENU_ITEMS.map(({ to, label, desc, icon: Icon, color, bg }) => (
          <Link
            key={to}
            to={to}
            className="bg-white rounded-2xl border border-[#EBEBEB] p-4 shadow-sm flex items-center gap-3 hover:border-[#E8611A]/30 hover:shadow-md transition-all group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}
            >
              <Icon style={{ width: 18, height: 18, color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#0D0D0D] text-sm">{label}</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5 truncate">{desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#D1D5DB] group-hover:text-[#E8611A] transition-colors flex-shrink-0" />
          </Link>
        ))}

        {/* Admin card - admin only */}
        {isAdmin && (
          <Link
            to="/admin"
            className="bg-white rounded-2xl border border-[#EBEBEB] p-4 shadow-sm flex items-center gap-3 hover:border-[#E8611A]/30 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FEF0E8" }}>
              <LayoutDashboard style={{ width: 18, height: 18, color: "#E8611A" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#E8611A] text-sm">Admin Panel</p>
              <p className="text-xs text-[#9B9B9B] mt-0.5">Manage store</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#D1D5DB] group-hover:text-[#E8611A] transition-colors flex-shrink-0" />
          </Link>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#FECACA] bg-white text-[#EF4444] text-sm font-semibold hover:bg-[#FEF2F2] transition-colors shadow-sm"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
