"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listUsers,
  updateUser,
  revokeUserSessions,
  type AdminUser,
} from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/utils";
import {
  PageHeader,
  DataTable,
  Thead,
  Th,
  Td,
  Badge,
  Pagination,
  SearchInput,
  LoadingState,
  EmptyState,
  ConfirmModal,
} from "@/components/ui/shared";
import { Eye, UserX, UserCheck, ShieldAlert, KeyRound } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  // Confirmation modal state
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant?: "danger" | "primary";
  }>({ open: false, title: "", message: "", action: async () => {} });
  const [modalLoading, setModalLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers({
        search: search || undefined,
        limit,
        offset,
      });
      setUsers(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadUsers, search]);

  async function handleToggleActive(user: AdminUser) {
    const newActive = !user.is_active;
    setModal({
      open: true,
      title: newActive ? "Enable User" : "Disable User",
      message: newActive
        ? `Enable access for ${user.email}?`
        : `Disable ${user.email}? All active sessions will be revoked.`,
      variant: newActive ? "primary" : "danger",
      action: async () => {
        await updateUser(user.id, { is_active: newActive });
        loadUsers();
      },
    });
  }

  async function handleRevokeSessions(user: AdminUser) {
    setModal({
      open: true,
      title: "Revoke All Sessions",
      message: `This will invalidate all active sessions for ${user.email}. They will be forced to log in again.`,
      variant: "danger",
      action: async () => {
        await revokeUserSessions(user.id);
        loadUsers();
      },
    });
  }

  async function executeModal() {
    setModalLoading(true);
    try {
      await modal.action();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setModalLoading(false);
      setModal((m) => ({ ...m, open: false }));
    }
  }

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="User Management"
        description={`${total} total users registered`}
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setOffset(0);
          }}
          placeholder="Search by email or name..."
          className="w-72"
        />
      </div>

      {loading && !users.length ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState message="No users found" />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>#</Th>
              <Th>Email</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Badge</Th>
              <Th>Role</Th>
              <Th>Verified</Th>
              <Th>Created</Th>
              <Th>Last Login</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/30 transition-colors">
                <Td className="text-xs text-zinc-500 font-mono">
                  {u.user_number ?? "--"}
                </Td>
                <Td>
                  <span className="font-mono text-xs">{u.email}</span>
                </Td>
                <Td>{u.name || "--"}</Td>
                <Td>
                  <Badge variant={u.is_active ? "success" : "danger"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </Badge>
                </Td>
                <Td>
                  {u.milestone_badge ? (
                    <MilestoneBadge badge={u.milestone_badge} />
                  ) : (
                    <span className="text-xs text-zinc-600">--</span>
                  )}
                </Td>
                <Td>
                  {u.is_superuser ? (
                    <Badge variant="warning">Superuser</Badge>
                  ) : (
                    <Badge>User</Badge>
                  )}
                </Td>
                <Td>
                  <Badge variant={u.email_verified ? "success" : "default"}>
                    {u.email_verified ? "Yes" : "No"}
                  </Badge>
                </Td>
                <Td className="text-xs text-zinc-500">
                  {formatDate(u.created_at)}
                </Td>
                <Td className="text-xs text-zinc-500">
                  {timeAgo(u.last_login_at)}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/users/${u.id}`)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title={u.is_active ? "Disable" : "Enable"}
                    >
                      {u.is_active ? (
                        <UserX className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRevokeSessions(u)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="Revoke sessions"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={10}>
                <Pagination
                  total={total}
                  limit={limit}
                  offset={offset}
                  onPageChange={setOffset}
                />
              </td>
            </tr>
          </tfoot>
        </DataTable>
      )}

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmVariant={modal.variant}
        onConfirm={executeModal}
        onCancel={() => setModal((m) => ({ ...m, open: false }))}
        loading={modalLoading}
      />
    </div>
  );
}

function MilestoneBadge({ badge }: { badge: string }) {
  const configs: Record<
    string,
    {
      label: string;
      variant: "warning" | "info" | "success" | "danger" | "default";
    }
  > = {
    top_20: { label: "Top 20", variant: "danger" },
    top_50: { label: "Top 50", variant: "warning" },
    top_100: { label: "Top 100", variant: "info" },
    top_1000: { label: "Top 1000", variant: "success" },
  };
  const config = configs[badge] || {
    label: badge.replace(/_/g, " "),
    variant: "default" as const,
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
