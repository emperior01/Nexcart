import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, ShieldOff, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Seller = Database["public"]["Tables"]["sellers"]["Row"];

const statusStyles: Record<string, { bg: string; color: string }> = {
  pending:   { bg: "#FEF3C7", color: "#92400E" },
  verified:  { bg: "#D1FAE5", color: "#065F46" },
  rejected:  { bg: "#FEE2E2", color: "#991B1B" },
  suspended: { bg: "#F3F4F6", color: "#6B7280" },
};

export default function AdminSellers() {
  const qc = useQueryClient();

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: async (): Promise<(Seller & { product_count?: number })[]> => {
      const { data } = await supabase
        .from("sellers")
        .select("*")
        .order("created_at", { ascending: false });
      return (data ?? []) as Seller[];
    },
  });

  async function updateStatus(id: string, status: Seller["verification_status"]) {
    const { error } = await (supabase.from("sellers") as any).update({ verification_status: status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Seller ${status}.`);
      qc.invalidateQueries({ queryKey: ["admin-sellers"] });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Seller Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{sellers?.length ?? 0} sellers registered</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : (sellers ?? []).length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-muted-foreground">No sellers yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["Store","Contact","Joined","Status","Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sellers!.map((seller) => {
                  const s = statusStyles[seller.verification_status] ?? statusStyles.pending;
                  return (
                    <tr key={seller.id} className="hover:bg-secondary/20 transition-colors">
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
                          <div>
                            <p className="font-bold text-foreground line-clamp-1">{seller.store_name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{seller.store_description ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground">{seller.phone ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{seller.address ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(seller.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 50, background: s.bg, color: s.color }}>
                          {seller.verification_status.charAt(0).toUpperCase() + seller.verification_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {seller.verification_status === "verified" && (
                            <Link to={`/store/${seller.id}`}>
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="View store">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          {seller.verification_status !== "verified" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => updateStatus(seller.id, "verified")}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Approve
                            </Button>
                          )}
                          {seller.verification_status !== "rejected" && seller.verification_status !== "suspended" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
                              onClick={() => updateStatus(seller.id, "rejected")}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </Button>
                          )}
                          {seller.verification_status === "verified" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-gray-700 hover:bg-gray-50"
                              onClick={() => updateStatus(seller.id, "suspended")}
                            >
                              <ShieldOff className="h-3.5 w-3.5" /> Suspend
                            </Button>
                          )}
                          {seller.verification_status === "suspended" && (
                            <Button
                              size="sm" variant="outline"
                              className="gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => updateStatus(seller.id, "verified")}
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Reinstate
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
