import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  ShieldOff,
  Users as UsersIcon,
  AlertCircle,
  Search,
  UserCheck,
  UserPlus,
  Ban,
  ShoppingBag,
  Mail,
  Calendar,
  Clock,
  Wallet,
  CircleSlash,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select, Skeleton, Badge } from "@/components/ui/index";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { useStepUp } from "@/hooks/use-step-up";
import { StepUpDialog } from "@/components/nexcart/StepUpDialog";

/* Types */

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  banned: boolean | null;
  updated_at: string | null;
};

type RoleRow = { user_id: string; role: string };
type SellerRow = { user_id: string };
type OrderAggRow = { user_id: string; total: number };

type UserRole = "admin" | "seller" | "customer";
type FilterValue = "all" | "customers" | "sellers" | "admins" | "banned";

interface AdminUserRecord {
  id: string;
  fullName: string | null;
  email: string | null;
  banned: boolean;
  updatedAt: string | null;
  isAdmin: boolean;
  isSeller: boolean;
  orderCount: number;
  totalSpent: number;
  derivedRole: UserRole;
}

interface UsersPageData {
  users: AdminUserRecord[];
  totalCount: number;
  rlsRestricted: boolean;
}

type UserAuthDetail = {
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  phoneConfirmedAt: string | null;
};

/** Pulls registration date / last login / verification status straight from
 * Supabase Auth (via the user-detail admin action) — these aren't stored on
 * `profiles` and don't need to be; Supabase already tracks them per user. */
async function fetchUserDetail(userId: string): Promise<UserAuthDetail> {
  const fallback: UserAuthDetail = {
    createdAt: null,
    lastSignInAt: null,
    emailConfirmedAt: null,
    phoneConfirmedAt: null,
  };
  const res = await fetch("/api/admin/moderation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ action: "user-detail", userId }),
  });
  if (!res.ok) return fallback;
  const data = await res.json().catch(() => ({}));
  return {
    createdAt: data.createdAt ?? null,
    lastSignInAt: data.lastSignInAt ?? null,
    emailConfirmedAt: data.emailConfirmedAt ?? null,
    phoneConfirmedAt: data.phoneConfirmedAt ?? null,
  };
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not available";
  return (
    d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

const PAGE_SIZE = 10;

/* Data fetching */

async function fetchUsersData(): Promise<UsersPageData> {
  const [profilesRes, rolesRes, sellersRes, ordersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, banned, updated_at", { count: "exact" }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("sellers").select("user_id"),
    supabase.from("orders").select("user_id, total"),
  ]);

  if (profilesRes.error) throw profilesRes.error;

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const totalCount = profilesRes.count ?? profiles.length;

  const roles = (rolesRes.data ?? []) as RoleRow[];
  const adminIds = new Set(roles.filter((r) => r.role === "admin").map((r) => r.user_id));

  const sellers = (sellersRes.data ?? []) as SellerRow[];
  const sellerIds = new Set(sellers.map((s) => s.user_id));

  const orders = (ordersRes.data ?? []) as OrderAggRow[];
  const orderStats = new Map<string, { count: number; total: number }>();
  for (const o of orders) {
    const existing = orderStats.get(o.user_id) ?? { count: 0, total: 0 };
    existing.count += 1;
    existing.total += Number(o.total) || 0;
    orderStats.set(o.user_id, existing);
  }

  const users: AdminUserRecord[] = profiles.map((p) => {
    const isAdmin = adminIds.has(p.id);
    const isSeller = sellerIds.has(p.id);
    const stats = orderStats.get(p.id) ?? { count: 0, total: 0 };
    const derivedRole: UserRole = isAdmin ? "admin" : isSeller ? "seller" : "customer";

    return {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      banned: !!p.banned,
      updatedAt: p.updated_at,
      isAdmin,
      isSeller,
      orderCount: stats.count,
      totalSpent: stats.total,
      derivedRole,
    };
  });

  return {
    users,
    totalCount,
    rlsRestricted: profiles.length < totalCount,
  };
}

/* Small UI pieces */

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  note,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  note?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #EBEBEB",
        borderRadius: 16,
        padding: "14px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 20, height: 20, color: "#fff" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase" as const,
            letterSpacing: "0.1em",
            color: "#6B7280",
            marginBottom: 3,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: "'Inter',sans-serif",
            fontWeight: 800,
            fontSize: 22,
            color: "#0D0D0D",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </p>
        {note && (
          <p style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>{note}</p>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-bold text-primary">
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  }
  if (role === "seller") {
    return (
      <Badge variant="secondary" style={{ fontWeight: 700 }}>
        Seller
      </Badge>
    );
  }
  return <span className="text-xs text-muted-foreground">Customer</span>;
}

function StatusBadge({ banned }: { banned: boolean }) {
  if (banned) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11,
          fontWeight: 700,
          padding: "3px 9px",
          borderRadius: 50,
          background: "#FEE2E2",
          color: "#991B1B",
        }}
      >
        <CircleSlash style={{ width: 11, height: 11 }} /> Banned
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 9px",
        borderRadius: 50,
        background: "#D1FAE5",
        color: "#065F46",
      }}
    >
      <CheckCircle2 style={{ width: 11, height: 11 }} /> Active
    </span>
  );
}

/* Main page */

export default function AdminUsers() {
  const qc = useQueryClient();
  const { open, setOpen, runWithStepUp, handleVerified } = useStepUp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsersData,
    staleTime: 0,
  });

  const { data: userDetail, isLoading: userDetailLoading } = useQuery({
    queryKey: ["admin-user-detail", selectedUser?.id],
    queryFn: () => fetchUserDetail(selectedUser!.id),
    enabled: !!selectedUser,
    staleTime: 60_000,
  });

  async function toggleAdmin(userId: string, currentlyAdmin: boolean) {
    const confirmMessage = currentlyAdmin
      ? "Remove admin privileges from this user?"
      : "Grant this user full admin access? They'll be able to manage all users, orders, and settings.";
    if (!window.confirm(confirmMessage)) return;

    const res = await runWithStepUp(() =>
      fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: currentlyAdmin ? "demote-admin" : "promote-admin",
          userId,
        }),
      })
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to update admin status.");
      return;
    }
    toast.success(currentlyAdmin ? "Admin privileges removed." : "Admin role granted.");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function toggleBan(userId: string, currentlyBanned: boolean) {
    let reason: string | undefined;
    if (!currentlyBanned) {
      const input = window.prompt("Reason for banning this user (optional):");
      if (input === null) return; // cancelled
      reason = input.trim() || undefined;
    } else if (!window.confirm("Reactivate this user's account?")) {
      return;
    }

    const res = await runWithStepUp(() =>
      fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "ban-user", userId, banned: !currentlyBanned, reason }),
      })
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to update.");
      return;
    }
    toast.success(currentlyBanned ? "User reactivated." : "User banned.");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  const allUsers = data?.users ?? [];
  const totalCount = data?.totalCount ?? 0;
  const rlsRestricted = data?.rlsRestricted ?? false;

  const stats = useMemo(() => {
    const adminCount = allUsers.filter((u) => u.isAdmin).length;
    const activeCount = allUsers.filter((u) => u.orderCount > 0).length;
    return {
      total: totalCount,
      admins: adminCount,
      active: activeCount,
    };
  }, [allUsers, totalCount]);

  const filteredUsers = useMemo(() => {
    let list = allUsers;

    if (filter === "customers") list = list.filter((u) => u.derivedRole === "customer");
    else if (filter === "sellers") list = list.filter((u) => u.isSeller);
    else if (filter === "admins") list = list.filter((u) => u.isAdmin);
    else if (filter === "banned") list = list.filter((u) => u.banned);

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.fullName ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allUsers, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleFilterChange(value: FilterValue) {
    setFilter(value);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage registered users, roles, and account status.
        </p>
      </div>

      {isError && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#FEE2E2",
            border: "1px solid #FECACA",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <AlertCircle style={{ width: 15, height: 15, color: "#991B1B", flexShrink: 0, marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B" }}>
              Failed to load users
            </p>
            <p style={{ fontSize: 12, color: "#B91C1C", marginTop: 3 }}>
              {(error as any)?.message ?? "An unexpected error occurred."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }} className="sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: 16, background: "#EBEBEB" }} />
          ))
        ) : (
          <>
            <StatCard
              label="Total Users"
              value={stats.total}
              icon={UsersIcon}
              gradient="linear-gradient(135deg,#8B5CF6,#6D28D9)"
            />
            <StatCard
              label="New This Month"
              value="Not available"
              icon={UserPlus}
              gradient="linear-gradient(135deg,#3B82F6,#1D4ED8)"
            />
            <StatCard
              label="Admin Users"
              value={stats.admins}
              icon={Shield}
              gradient="linear-gradient(135deg,#E8611A,#C4511A)"
            />
            <StatCard
              label="Active Users"
              value={stats.active}
              icon={UserCheck}
              gradient="linear-gradient(135deg,#10B981,#065F46)"
              note="Has placed an order"
            />
          </>
        )}
      </div>

      {!isLoading && rlsRestricted && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <AlertCircle style={{ width: 15, height: 15, color: "#D97706", flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              Row-level security is hiding {totalCount - allUsers.length} user profile
              {totalCount - allUsers.length !== 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: 12, color: "#B45309", marginTop: 3, lineHeight: 1.5 }}>
              The total count ({totalCount}) matches the dashboard. Check the admin RLS
              policy on the <code style={{ background: "#FDE68A", padding: "1px 4px", borderRadius: 3 }}>profiles</code> table.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 15,
              height: 15,
              color: "#9CA3AF",
            }}
          />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <Select
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as FilterValue)}
          className="sm:w-48"
        >
          <option value="all">All Users</option>
          <option value="customers">Customers</option>
          <option value="sellers">Sellers</option>
          <option value="admins">Admins</option>
          <option value="banned">Banned Users</option>
        </Select>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center" as const }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <UsersIcon style={{ width: 24, height: 24, color: "#7C3AED" }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 4 }}>
              {allUsers.length === 0 ? "No users yet" : "No users match your search"}
            </p>
            <p style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.5 }}>
              {allUsers.length === 0
                ? "Registered users will appear here."
                : "Try adjusting your search or filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="border-b border-border/50 bg-secondary/30">
                  <tr>
                    {["User", "Email", "Role", "Orders", "Status", ""].map((h) => (
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
                  {pageUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="grid h-8 w-8 place-items-center rounded-full text-white text-xs font-black flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                          >
                            {(u.fullName?.[0] ?? "?").toUpperCase()}
                          </div>
                          <span className="font-medium text-foreground">{u.fullName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email ?? "—"}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={u.derivedRole} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.orderCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge banned={u.banned} />
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs whitespace-nowrap"
                            onClick={() => toggleAdmin(u.id, u.isAdmin)}
                          >
                            {u.isAdmin ? (
                              <>
                                <ShieldOff className="h-3.5 w-3.5" /> Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="h-3.5 w-3.5" /> Make Admin
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs whitespace-nowrap"
                            onClick={() => toggleBan(u.id, u.banned)}
                          >
                            {u.banned ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5" /> Unban
                              </>
                            ) : (
                              <>
                                <Ban className="h-3.5 w-3.5" /> Ban
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <p style={{ fontSize: 12, color: "#9CA3AF" }}>
                  Page {currentPage} of {totalPages} · {filteredUsers.length} user
                  {filteredUsers.length !== 1 ? "s" : ""}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        style={{ cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <PaginationItem key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 ? (
                            <span style={{ padding: "0 6px", color: "#9CA3AF" }}>…</span>
                          ) : null}
                          <PaginationLink isActive={p === currentPage} onClick={() => setPage(p)} style={{ cursor: "pointer" }}>
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        style={{ cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
        {isFetching && !isLoading && (
          <div style={{ padding: "8px 16px", fontSize: 11, color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}>
            Refreshing…
          </div>
        )}
      </div>

      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent className="overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div
                    className="grid h-9 w-9 place-items-center rounded-full text-white text-sm font-black flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#E8611A,#C4511A)" }}
                  >
                    {(selectedUser.fullName?.[0] ?? "?").toUpperCase()}
                  </div>
                  {selectedUser.fullName ?? "Unnamed user"}
                </SheetTitle>
                <SheetDescription>Account details and activity</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-2">
                  <RoleBadge role={selectedUser.derivedRole} />
                  <StatusBadge banned={selectedUser.banned} />
                </div>

                <div className="space-y-3">
                  <DetailRow icon={Mail} label="Email" value={selectedUser.email ?? "—"} />
                  <DetailRow
                    icon={Calendar}
                    label="Registration Date"
                    value={userDetailLoading ? "Loading…" : formatDate(userDetail?.createdAt ?? null)}
                  />
                  <DetailRow
                    icon={Clock}
                    label="Last Login"
                    value={userDetailLoading ? "Loading…" : formatDate(userDetail?.lastSignInAt ?? null)}
                  />
                  <DetailRow
                    icon={CheckCircle2}
                    label="Email Verified"
                    value={userDetailLoading ? "Loading…" : userDetail?.emailConfirmedAt ? "Yes" : "No"}
                  />
                  <DetailRow
                    icon={ShoppingBag}
                    label="Total Orders"
                    value={String(selectedUser.orderCount)}
                  />
                  <DetailRow
                    icon={Wallet}
                    label="Total Spent"
                    value={"$" + selectedUser.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => toggleAdmin(selectedUser.id, selectedUser.isAdmin)}
                  >
                    {selectedUser.isAdmin ? (
                      <>
                        <ShieldOff className="h-4 w-4" /> Remove Admin
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4" /> Make Admin
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => toggleBan(selectedUser.id, selectedUser.banned)}
                  >
                    {selectedUser.banned ? (
                      <>
                        <UserCheck className="h-4 w-4" /> Unban User
                      </>
                    ) : (
                      <>
                        <Ban className="h-4 w-4" /> Ban User
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 justify-start"
                    onClick={() => {
                      window.location.href = "/admin/orders?user=" + selectedUser.id;
                    }}
                  >
                    <ShoppingBag className="h-4 w-4" /> View Orders
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <StepUpDialog
        open={open}
        onOpenChange={setOpen}
        onVerified={handleVerified}
        description="This action requires a fresh password confirmation. Please re-enter your password to continue."
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary/50 flex-shrink-0">
        <Icon style={{ width: 14, height: 14, color: "#6B7280" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
          {label}
        </p>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#0D0D0D", marginTop: 1 }}>{value}</p>
        {note && <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{note}</p>}
      </div>
    </div>
  );
}
