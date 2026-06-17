import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield, ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/index";
import { toast } from "sonner";

type AdminUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string;
  created_at: string;
};

export default function AdminUsers() {
  const qc = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      // Use RPC so SECURITY DEFINER bypasses RLS and joins auth.users for email
      const { data, error } = await supabase.rpc("admin_get_all_users" as any);
      if (error) {
        // Fallback: query profiles directly (works if admin RLS policy exists)
        const { data: rawProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone, created_at");
        const { data: rawRoles } = await supabase
          .from("user_roles")
          .select("user_id, role");
        const profiles = (rawProfiles ?? []) as {
          id: string;
          full_name: string | null;
          phone: string | null;
          created_at: string;
        }[];
        const roles = (rawRoles ?? []) as { user_id: string; role: string }[];
        const roleMap = new Map(roles.map((r) => [r.user_id, r.role]));
        return profiles.map((p) => ({
          id: p.id,
          full_name: p.full_name,
          email: null,
          phone: p.phone,
          role: roleMap.get(p.id) ?? null,
          status: "active",
          created_at: p.created_at,
        }));
      }
      return (data ?? []) as AdminUser[];
    },
  });

  async function toggleAdmin(userId: string, currentRole: string | null) {
    if (currentRole === "admin") {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (error) toast.error(error.message);
      else toast.success("Admin role removed.");
    } else {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" } as any);
      if (error) toast.error(error.message);
      else toast.success("Admin role granted.");
    }
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {users?.length ?? 0} registered
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : (users ?? []).length === 0 ? (
          <p className="p-12 text-center text-muted-foreground">No users found.</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  {["User", "Email", "Phone", "Role", "Status", "Joined", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users!.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                    {/* Full Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="grid h-8 w-8 place-items-center rounded-full text-white text-xs font-black flex-shrink-0"
                          style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                        >
                          {(u.full_name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground whitespace-nowrap">
                          {u.full_name ?? "—"}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.email ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {u.phone ?? <span className="italic text-muted-foreground/50">—</span>}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
                          <Shield className="h-3 w-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Customer</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          u.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {u.status ?? "active"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs whitespace-nowrap"
                        onClick={() => toggleAdmin(u.id, u.role)}
                      >
                        {u.role === "admin" ? (
                          <>
                            <ShieldOff className="h-3.5 w-3.5" /> Remove Admin
                          </>
                        ) : (
                          <>
                            <Shield className="h-3.5 w-3.5" /> Make Admin
                          </>
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
