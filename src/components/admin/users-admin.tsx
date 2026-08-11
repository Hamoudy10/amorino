"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { Search, RefreshCw, Lock, Unlock, Trash2, Loader2, Users as UsersIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/ui/sonner";
import { formatKES, formatDateTime, timeAgo } from "@/lib/utils";

interface UserRow {
  id: string;
  clerkId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
  isActive: boolean | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

const ROLE_VARIANT: Record<string, "default" | "success" | "secondary" | "destructive" | "outline"> = {
  owner: "destructive",
  admin: "default",
  rider: "success",
  customer: "secondary",
};

export function UsersAdmin() {
  const [users, setUsers] = React.useState<UserRow[] | null>(null);
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<UserRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchUsers = React.useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role !== "all") params.set("role", role);
    if (status !== "all") params.set("status", status);
    try {
      const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setUsers(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignored
    }
  }, [q, role, status]);

  React.useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const toggleLock = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, isActive: !u.isActive }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not update user");
        return;
      }
      toast.success(json.data.locked ? `${u.name ?? u.phone ?? u.email} locked out` : `${u.name ?? u.phone ?? u.email} unlocked`);
      await fetchUsers();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not delete user");
        return;
      }
      toast.success(
        json.data.anonymised
          ? "Account removed — history kept (anonymised)"
          : "Account deleted"
      );
      setDeleteTarget(null);
      await fetchUsers();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  const changeRole = async (u: UserRow, role: string) => {
    setBusyId(u.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id, role }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not change role");
        return;
      }
      toast.success(`${u.name ?? u.phone ?? u.email} is now ${role}`);
      await fetchUsers();
    } catch {
      toast.error("Network error");
    } finally {
      setBusyId(null);
    }
  };

  const currentUserRole = useUser().user?.publicMetadata?.role as string | undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Every account on the system — customers, riders, admins and owners.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void fetchUsers()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email…"
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="customer">Customers</option>
          <option value="rider">Riders</option>
          <option value="admin">Admins</option>
          <option value="owner">Owners</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="locked">Locked</option>
        </select>
      </div>

      {users === null ? (
        <Skeleton className="h-72 w-full" />
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UsersIcon className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No users match your filters</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Orders</th>
                  <th className="px-4 py-3">Total spent</th>
                  <th className="px-4 py-3">Last order</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.phone ?? "no phone"} · {u.email ?? "no email"}
                      </p>
                      {u.clerkId && (
                        <p className="max-w-[220px] truncate font-mono text-[10px] text-muted-foreground">
                          {u.clerkId}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {currentUserRole === "owner" && u.role !== "owner" ? (
                        <select
                          value={u.role}
                          disabled={busyId === u.id}
                          onChange={(e) => void changeRole(u, e.target.value)}
                          className="h-7 rounded-md border bg-background px-2 text-xs"
                          aria-label={`Change role for ${u.name ?? u.email ?? u.id}`}
                        >
                          <option value="customer">customer</option>
                          <option value="rider">rider</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        <Badge variant={ROLE_VARIANT[u.role] ?? "outline"}>{u.role}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={u.isActive ? "success" : "destructive"}>
                        {u.isActive ? "Active" : "Locked"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{u.orderCount}</td>
                    <td className="px-4 py-2.5 tabular-nums">{formatKES(u.totalSpent)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {u.lastOrderAt ? timeAgo(u.lastOrderAt) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatDateTime(u.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        {u.role !== "owner" && (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              title={u.isActive ? "Lock out" : "Unlock"}
                              disabled={busyId === u.id}
                              onClick={() => void toggleLock(u)}
                            >
                              {busyId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : u.isActive ? (
                                <Lock className="h-4 w-4" />
                              ) : (
                                <Unlock className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              title="Delete user"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={busyId === u.id}
                              onClick={() => setDeleteTarget(u)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name ?? deleteTarget?.phone ?? "user"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && Number(deleteTarget.orderCount) > 0
                ? `This account has ${deleteTarget.orderCount} order(s). Their order history will be kept for accounting, but the account will be anonymised and banned.`
                : "This account will be permanently deleted and banned from signing in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void doDelete();
              }}
            >
              {deleting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}