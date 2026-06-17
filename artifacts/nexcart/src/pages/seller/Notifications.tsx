import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, ShoppingBag, Package, Wallet, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["seller_notifications"]["Row"];

// Pick a relevant icon based on the notification title keyword
function NotifIcon({ title, isRead }: { title: string; isRead: boolean }) {
  const lower = title.toLowerCase();
  let Icon = Bell;
  let color = isRead ? "#9CA3AF" : "#E8611A";
  let bg = isRead ? "#F3F4F6" : "rgba(232,97,26,0.1)";

  if (lower.includes("order")) { Icon = ShoppingBag; color = isRead ? "#9CA3AF" : "#3B82F6"; bg = isRead ? "#F3F4F6" : "rgba(59,130,246,0.1)"; }
  else if (lower.includes("product") || lower.includes("stock")) { Icon = Package; color = isRead ? "#9CA3AF" : "#D97706"; bg = isRead ? "#F3F4F6" : "rgba(217,119,6,0.1)"; }
  else if (lower.includes("withdraw") || lower.includes("payout")) { Icon = Wallet; color = isRead ? "#9CA3AF" : "#8B5CF6"; bg = isRead ? "#F3F4F6" : "rgba(139,92,246,0.1)"; }
  else if (lower.includes("alert") || lower.includes("warning")) { Icon = AlertTriangle; color = isRead ? "#9CA3AF" : "#EF4444"; bg = isRead ? "#F3F4F6" : "rgba(239,68,68,0.1)"; }
  else if (lower.includes("info") || lower.includes("update")) { Icon = Info; color = isRead ? "#9CA3AF" : "#059669"; bg = isRead ? "#F3F4F6" : "rgba(5,150,105,0.1)"; }

  return (
    <div style={{
      width: 38, height: 38, borderRadius: 11, flexShrink: 0,
      background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <Icon style={{ width: 16, height: 16, color }} />
    </div>
  );
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function SellerNotifications() {
  const { seller } = useSeller();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["seller-notifications", seller?.id],
    enabled: !!seller?.id,
    queryFn: async (): Promise<Notification[]> => {
      if (!seller?.id) return [];
      const { data } = await supabase
        .from("seller_notifications")
        .select("*")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Notification[];
    },
  });

  async function markAsRead(id: string) {
    const { error } = await (supabase.from("seller_notifications") as any).update({ is_read: true }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["seller-notifications", seller?.id] });
      qc.invalidateQueries({ queryKey: ["seller-unread-count", seller?.id] });
    }
  }

  async function markAllRead() {
    if (!seller?.id) return;
    const unread = (notifications ?? []).filter((n) => !n.is_read).map((n) => n.id);
    if (unread.length === 0) return;
    const { error } = await (supabase.from("seller_notifications") as any)
      .update({ is_read: true })
      .in("id", unread);
    if (error) toast.error(error.message);
    else {
      toast.success("All notifications marked as read.");
      qc.invalidateQueries({ queryKey: ["seller-notifications", seller?.id] });
      qc.invalidateQueries({ queryKey: ["seller-unread-count", seller?.id] });
    }
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;
  const unread = (notifications ?? []).filter((n) => !n.is_read);
  const read = (notifications ?? []).filter((n) => n.is_read);

  return (
    <div style={{ padding: "16px", maxWidth: 640, margin: "0 auto", boxSizing: "border-box" as const }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 24, letterSpacing: "-0.03em", color: "#0D0D0D" }}>
            Notifications
          </h1>
          <p style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>
            {unreadCount > 0 ? (
              <span>
                <span style={{ fontWeight: 800, color: "#E8611A" }}>{unreadCount}</span>
                {" unread notification"}{unreadCount !== 1 ? "s" : ""}
              </span>
            ) : "All caught up — no unread notifications"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#fff", border: "1px solid #E5E7EB",
              borderRadius: 9, padding: "8px 13px",
              fontSize: 12, fontWeight: 700, color: "#4B5563",
              cursor: "pointer", flexShrink: 0,
              boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            }}
          >
            <CheckCheck style={{ width: 13, height: 13 }} />
            Mark all read
          </button>
        )}
      </div>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(232,97,26,0.08)", border: "1px solid rgba(232,97,26,0.2)",
          borderRadius: 50, padding: "5px 12px", marginBottom: 16,
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#E8611A" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#E8611A" }}>
            {unreadCount} unread
          </span>
        </div>
      )}

      {/* Notification list */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (notifications ?? []).length === 0 ? (
        /* Empty state */
        <div style={{
          background: "#fff", border: "1px solid #F3F4F6", borderRadius: 20,
          padding: "52px 24px", textAlign: "center" as const,
          boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg,#F3F4F6,#E5E7EB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Bell style={{ width: 30, height: 30, color: "#D1D5DB" }} />
          </div>
          <p style={{ fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: 16, color: "#374151", marginBottom: 8 }}>
            No notifications yet
          </p>
          <p style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
            You'll be notified here about new orders, withdrawal updates, stock alerts, and more.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
          {/* Unread section */}
          {unread.length > 0 && (
            <>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#9CA3AF", padding: "4px 2px 6px" }}>
                Unread
              </p>
              {unread.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: "rgba(232,97,26,0.03)",
                    border: "1px solid rgba(232,97,26,0.15)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    display: "flex", alignItems: "flex-start", gap: 12,
                  }}
                >
                  <NotifIcon title={n.title} isRead={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: "#0D0D0D" }}>{n.title}</p>
                      <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" as const }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5 }}>{n.message}</p>
                  </div>
                  <button
                    onClick={() => markAsRead(n.id)}
                    title="Mark as read"
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(232,97,26,0.1)", border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, marginTop: 2,
                    }}
                  >
                    <Check style={{ width: 12, height: 12, color: "#E8611A" }} />
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Read section */}
          {read.length > 0 && (
            <>
              {unread.length > 0 && (
                <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#D1D5DB", padding: "8px 2px 6px" }}>
                  Earlier
                </p>
              )}
              {read.map((n) => (
                <div
                  key={n.id}
                  style={{
                    background: "#fff",
                    border: "1px solid #F3F4F6",
                    borderRadius: 14,
                    padding: "13px 16px",
                    display: "flex", alignItems: "flex-start", gap: 12,
                  }}
                >
                  <NotifIcon title={n.title} isRead={true} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{n.title}</p>
                      <span style={{ fontSize: 10, color: "#D1D5DB", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" as const }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>{n.message}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
