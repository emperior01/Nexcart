import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, ShieldOff, Eye, Mail, Phone, MapPin, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

type SellerApplication = {
  id: string;
  user_id: string;
  user_email: string;
  store_name: string;
  store_description: string | null;
  store_logo: string | null;
  phone: string | null;
  address: string | null;
  verification_status: "pending" | "verified" | "rejected" | "suspended";
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  verified:  { bg: "#D1FAE5", color: "#065F46", label: "Approved" },
  rejected:  { bg: "#FEE2E2", color: "#991B1B", label: "Rejected" },
  suspended: { bg: "#F3F4F6", color: "#6B7280", label: "Suspended" },
};

type TabFilter = "all" | "pending" | "verified" | "rejected" | "suspended";
const tabFilters: TabFilter[] = ["all", "pending", "verified", "rejected", "suspended"];

export default function AdminSellers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [currentFilter, setCurrentFilter] = useState<TabFilter>("all");

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async (): Promise<SellerApplication[]> => {
      const { data, error } = await (supabase as any).rpc("get_seller_applications");
      if (error) {
        console.warn("RPC not available, falling back to direct query:", error.message);
        const { data: fallback } = await supabase
          .from("sellers")
          .select("*")
          .order("created_at", { ascending: false });
        return ((fallback ?? []) as any[]).map((s) => ({ ...s, user_email: "—" }));
      }
      return (data ?? []) as SellerApplication[];
    },
  });

  const filtered = (sellers ?? []).filter(
    (s) => currentFilter === "all" || s.verification_status === currentFilter
  );

  const counts = (sellers ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.verification_status] = (acc[s.verification_status] ?? 0) + 1;
    acc.all = (acc.all ?? 0) + 1;
    return acc;
  }, { all: 0 });

  async function updateStatus(seller: SellerApplication, status: SellerApplication["verification_status"]) {
    const { error } = await (supabase.from("sellers") as any).update({
      verification_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id ?? null,
    }).eq("id", seller.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (status === "verified" || status === "rejected") {
      const title = status === "verified" ? "Application Approved 🎉" : "Application Update";
      const message =
        status === "verified"
          ? `Congratulations! Your store "${seller.store_name}" has been approved. You can now access your Seller Dashboard and start listing products.`
          : `Your seller application for "${seller.store_name}" has been reviewed and was not approved at this time. Please contact support for more information.`;

      await (supabase.from("seller_notifications") as any).insert({
        seller_id: seller.id,
        title,
        message,
      });
    }

    const labels: Record<string, string> = {
      verified:  "Seller approved — notification sent.",
      rejected:  "Seller rejected — notification sent.",
      suspended: "Seller suspended.",
      pending:   "Seller status reset to pending.",
    };
    toast.success(labels[status] ?? `Status updated to ${status}.`);
    qc.invalidateQueries({ queryKey: ["admin-sellers"] });
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">Seller Applications</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {sellers?.length ?? 0} total · {counts.pending ?? 0} pending review
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabFilters.map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentFilter(tab)}
            className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: currentFilter === tab ? "#E8611A" : "#F3F4F6",
              color: currentFilter === tab ? "#fff" : "#6B7280",
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {counts[tab] > 0 && (
              <span className="ml-1.5 opacity-80">({counts[tab]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-muted-foreground">
              No {currentFilter === "all" ? "" : currentFilter + " "}applications found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Store", "Contact", "Date Submitted", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((seller) => {
                  const s = statusConfig[seller.verification_status] ?? statusConfig.pending;
                  return (
                    <tr key={seller.id} className="hover:bg-secondary/20 transition-colors">

                      {/* Store */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center flex-shrink-0">
                            {seller.store_logo ? (
                              <img src={seller.store_logo} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-lg font-black text-orange-400">
                                {seller.store_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground line-clamp-1">{seller.store_name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {seller.store_description ?? "No description"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {seller.user_email && seller.user_email !== "—" && (
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{seller.user_email}</span>
                            </div>
                          )}
                          {seller.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>{seller.phone}</span>
                            </div>
                          )}
                          {seller.address && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="line-clamp-1 max-w-[180px]">{seller.address}</span>
                            </div>
                          )}
                          {!seller.phone && !seller.address && seller.user_email === "—" && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>

                      {/* Date Submitted */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground whitespace-nowrap">
                          {new Date(seller.created_at).toLocaleDateString("en-US", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </div>
                        {seller.reviewed_at && (
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            Reviewed{" "}
                            {new Date(seller.reviewed_at).toLocaleDateString("en-US", {
                              month: "short", day: "numeric",
                            })}
                          </div>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          style={{
                            fontSize: 10, fontWeight: 700, padding: "3px 10px",
                            borderRadius: 50, background: s.bg, color: s.color,
                            display: "inline-block",
                          }}
                        >
                          {s.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {seller.verification_status === "verified" && (
                            <Link to="/store/$sellerId" params={{ sellerId: seller.id }}>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="View store">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          {seller.verification_status !== "verified" && seller.verification_status !== "suspended" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => updateStatus(seller, "verified")}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </Button>
                          )}
                          {(seller.verification_status === "pending" || seller.verification_status === "verified") && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => updateStatus(seller, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          )}
                          {seller.verification_status === "verified" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => updateStatus(seller, "suspended")}
                            >
                              <ShieldOff className="h-3.5 w-3.5" /> Suspend
                            </Button>
                          )}
                          {seller.verification_status === "suspended" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => updateStatus(seller, "verified")}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Reinstate
                            </Button>
                          )}
                          {seller.verification_status === "rejected" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                              onClick={() => updateStatus(seller, "pending")}
                            >
                              <Clock className="h-3.5 w-3.5" /> Reset to Pending
                            </Button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
