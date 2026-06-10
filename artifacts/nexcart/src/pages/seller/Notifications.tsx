import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSeller } from "@/hooks/use-seller";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Notification = Database["public"]["Tables"]["seller_notifications"]["Row"];

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
    else qc.invalidateQueries({ queryKey: ["seller-notifications", seller?.id] });
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
    }
  }

  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? (
              <span><span className="font-bold text-orange-500">{unreadCount}</span> unread</span>
            ) : (
              "All caught up"
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : (notifications ?? []).length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-16 text-center shadow-sm">
            <Bell style={{ width: 32, height: 32, color: "#D1D5DB", margin: "0 auto 12px" }} />
            <p className="text-muted-foreground font-medium">No notifications</p>
            <p className="text-sm text-muted-foreground mt-1">You'll be notified about orders, withdrawals, and stock alerts here.</p>
          </div>
        ) : (
          notifications!.map((n) => (
            <div
              key={n.id}
              style={{
                background: n.is_read ? "#fff" : "rgba(232,97,26,0.04)",
                border: `1px solid ${n.is_read ? "#EBEBEB" : "rgba(232,97,26,0.2)"}`,
                borderRadius: 16,
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: n.is_read ? "#F3F4F6" : "rgba(232,97,26,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bell style={{ width: 16, height: 16, color: n.is_read ? "#9CA3AF" : "#E8611A" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "#0D0D0D", marginBottom: 2 }}>{n.title}</p>
                <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5 }}>{n.message}</p>
                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <button
                  onClick={() => markAsRead(n.id)}
                  title="Mark as read"
                  style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(232,97,26,0.10)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                >
                  <Check style={{ width: 13, height: 13, color: "#E8611A" }} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
