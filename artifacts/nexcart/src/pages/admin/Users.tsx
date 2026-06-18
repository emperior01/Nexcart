import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldOff, Users, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

export default function AdminUsers() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      type Profile = { id: string; full_name: string | null; email: string | null; updated_at: string | null };
      type Role = { user_id: string; role: string };

      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, updated_at", { count: "exact" }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      const profiles = (profilesRes.data ?? []) as Profile[];
      const totalCount = profilesRes.count ?? profiles.length;
      const roles = (rolesRes.data ?? []) as Role[];
      const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));

      return {
        users: profiles.map((p) => ({ ...p, role: roleMap.get(p.id) ?? null })),
        totalCount,
        rlsRestricted: profiles.length < totalCount,
      };
    },
  });

  async function toggleAdmin(userId: string, currentRole: string | null) {
    if (currentRole === "admin") {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      if (error) toast.error(error.message);
      else toast.success("Admin role removed.");
    } else {
      const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: "admin" } as any);
      if (error) toast.error(error.message);
      else toast.success("Admin role granted.");
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const users = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const rlsRestricted = data?.rlsRestricted ?? false;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading…" : (
            <span>
              <span style={{ fontWeight: 800, color: "#0D0D0D" }}>{totalCount}</span> registered
              {users.length !== totalCount && (
                <span style={{ color: "#9CA3AF" }}> ({users.length} visible)</span>
              )}
            </span>
          )}
        </p>
      </div>

      {/* RLS warning — shown when DB count > visible rows */}
      {!isLoading && rlsRestricted && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          background: "#FEF3C7", border: "1px solid #FDE68A",
          borderRadius: 12, padding: "12px 14px",
        }}>
          <AlertCircle style={{ width: 15, height: 15, color: "#D97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              Row-level security is hiding {totalCount - users.length} user profile{totalCount - users.length !== 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: 12, color: "#B45309", marginTop: 3, lineHeight: 1.5 }}>
              The total count ({totalCount}) matches the dashboard. To see all rows here,
              add an RLS policy on the <code style={{ background: "#FDE68A", padding: "1px 4px", borderRadius: 3 }}>profiles</code> table
              allowing admin-role users to <code style={{ background: "#FDE68A", padding: "1px 4px", borderRadius: 3 }}>SELECT</code> all rows.
              See the <strong>Supabase migration note</strong> below for the exact SQL.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center" as const }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 12px",
            }}>
              <Users style={{ width: 24, height: 24, color: "#7C3AED" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
              {totalCount > 0 ? "Profiles hidden by RLS policy" : "No users yet"}
            </p>
            <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
              {totalCount > 0
                ? `${totalCount} user${totalCount !== 1 ? "s" : ""} exist in the database. Add an admin RLS policy to view them here.`
                : "Registered users will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["User", "Email", "Last Updated", "Role", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="grid h-8 w-8 place-items-center rounded-full text-white text-xs font-black flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                        >
                          {(u.full_name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Customer</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs whitespace-nowrap"
                        onClick={() => toggleAdmin(u.id, u.role)}
                      >
                        {u.role === "admin" ? (
                          <><ShieldOff className="h-3.5 w-3.5" /> Remove Admin</>
                        ) : (
                          <><Shield className="h-3.5 w-3.5" /> Make Admin</>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
