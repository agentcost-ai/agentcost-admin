"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getUserDetail,
  updateUser,
  revokeUserSessions,
  deleteUser,
  setAdminNotes,
  sendEmailToUser,
  type UserDetail,
} from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatCost,
} from "@/lib/utils";
import {
  PageHeader,
  StatCard,
  Badge,
  DataTable,
  Thead,
  Th,
  Td,
  LoadingState,
  ConfirmModal,
} from "@/components/ui/shared";
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  KeyRound,
  Trash2,
  Mail,
  Save,
} from "lucide-react";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Admin notes state
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  // Email state
  const [showEmail, setShowEmail] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  // Confirm modal
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<unknown>;
    variant?: "danger" | "primary";
    confirmLabel?: string;
  }>({ open: false, title: "", message: "", action: async () => {} });
  const [modalLoading, setModalLoading] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUserDetail(userId);
      setUser(data);
      setNotes(data.admin_notes || "");
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function executeModal() {
    setModalLoading(true);
    try {
      const result = await modal.action();
      // If the action signals "deleted", skip reloading (user no longer exists)
      if (result !== "deleted") {
        loadUser();
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setModalLoading(false);
      setModal((m) => ({ ...m, open: false }));
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    setNotesSaved(false);
    try {
      await setAdminNotes(userId, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setNotesSaving(false);
    }
  }

  async function handleSendEmail() {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setEmailSending(true);
    try {
      await sendEmailToUser(userId, emailSubject, emailBody);
      setEmailSubject("");
      setEmailBody("");
      setShowEmail(false);
    } catch (err) {
      console.error("Failed to send email:", err);
    } finally {
      setEmailSending(false);
    }
  }

  if (loading)
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  if (!user)
    return <div className="p-6 text-sm text-zinc-500">User not found</div>;

  return (
    <div className="p-6 max-w-350">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      <PageHeader
        title={user.email}
        description={user.name || "No display name set"}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmail(!showEmail)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded hover:text-zinc-200 transition-colors"
            >
              <Mail className="w-3 h-3" /> Email User
            </button>
            <button
              onClick={() =>
                setModal({
                  open: true,
                  title: user.is_active ? "Disable User" : "Enable User",
                  message: user.is_active
                    ? `Disable ${user.email}? All sessions will be revoked.`
                    : `Re-enable access for ${user.email}?`,
                  variant: user.is_active ? "danger" : "primary",
                  action: async () => {
                    await updateUser(userId, { is_active: !user.is_active });
                  },
                })
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
                user.is_active
                  ? "text-red-400 border-red-500/30 hover:bg-red-500/10"
                  : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              }`}
            >
              {user.is_active ? (
                <>
                  <ShieldOff className="w-3 h-3" /> Disable
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3 h-3" /> Enable
                </>
              )}
            </button>
            <button
              onClick={() =>
                setModal({
                  open: true,
                  title: "Revoke All Sessions",
                  message: `Invalidate all active sessions for ${user.email}?`,
                  variant: "danger",
                  action: async () => {
                    await revokeUserSessions(userId);
                  },
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded hover:text-zinc-200 transition-colors"
            >
              <KeyRound className="w-3 h-3" /> Revoke Sessions
            </button>
            {!user.is_superuser && (
              <button
                onClick={() =>
                  setModal({
                    open: true,
                    title: "Delete User Permanently",
                    message: `This will permanently delete ${user.email} and all their sessions and memberships. Owned projects will be orphaned. This action cannot be undone.`,
                    variant: "danger",
                    confirmLabel: "Delete Permanently",
                    action: async () => {
                      await deleteUser(userId);
                      router.push("/users");
                      return "deleted" as const;
                    },
                  })
                }
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        }
      />

      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Badge variant={user.is_active ? "success" : "danger"}>
          {user.is_active ? "Active" : "Disabled"}
        </Badge>
        {user.is_superuser && <Badge variant="warning">Superuser</Badge>}
        <Badge variant={user.email_verified ? "success" : "default"}>
          {user.email_verified ? "Email Verified" : "Unverified"}
        </Badge>
        {user.milestone_badge && (
          <MilestoneBadgeDisplay badge={user.milestone_badge} />
        )}
        <span className="text-xs text-zinc-500 ml-2">
          {user.active_sessions} active session(s)
        </span>
      </div>

      {/* Email panel */}
      {showEmail && (
        <div className="mb-6 border border-zinc-800/50 rounded-xl p-5 bg-zinc-900/30">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-3">
            Send Email to {user.email}
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Message body..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendEmail}
                disabled={
                  emailSending || !emailSubject.trim() || !emailBody.trim()
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Mail className="w-3 h-3" />
                {emailSending ? "Sending..." : "Send Email"}
              </button>
              <button
                onClick={() => setShowEmail(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Events"
          value={formatNumber(user.usage.total_events)}
        />
        <StatCard
          label="Tokens"
          value={formatNumber(user.usage.total_tokens)}
        />
        <StatCard label="Cost" value={formatCost(user.usage.total_cost)} />
        <StatCard label="Owned Projects" value={user.owned_projects.length} />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-zinc-800/50 rounded-xl p-5 bg-zinc-900/30">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Account Details
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">ID</span>
              <span className="font-mono text-xs text-zinc-400">{user.id}</span>
            </div>
            {user.user_number != null && (
              <div className="flex justify-between">
                <span className="text-zinc-500">User #</span>
                <span className="font-mono text-xs text-zinc-300">
                  #{user.user_number}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Created</span>
              <span className="text-zinc-300">
                {formatDateTime(user.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Login</span>
              <span className="text-zinc-300">
                {formatDateTime(user.last_login_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Admin notes */}
        <div className="border border-zinc-800/50 rounded-xl p-5 bg-zinc-900/30">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Admin Notes (Internal)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this user..."
            className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSaveNotes}
              disabled={notesSaving}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              {notesSaving ? "Saving..." : "Save Notes"}
            </button>
            {notesSaved && (
              <span className="text-xs text-emerald-400">Saved</span>
            )}
          </div>
        </div>
      </div>

      {/* Milestones */}
      {user.milestones && user.milestones.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Milestones
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {user.milestones.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 border border-zinc-800/50 rounded-xl p-4 bg-zinc-900/30"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-200">
                    {m.milestone_name || m.milestone_type.replace(/_/g, " ")}
                  </div>
                  {m.milestone_description && (
                    <div className="text-xs text-zinc-400 mt-0.5">
                      {m.milestone_description}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-zinc-600">
                  {formatDate(m.achieved_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owned Projects */}
      {user.owned_projects.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Owned Projects
          </h3>
          <DataTable>
            <Thead>
              <tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </Thead>
            <tbody>
              {user.owned_projects.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/projects/${p.id}`)}
                >
                  <Td>{p.name}</Td>
                  <Td>
                    <Badge variant={p.is_active ? "success" : "danger"}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-zinc-500">
                    {formatDate(p.created_at)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      {/* Memberships */}
      {user.memberships.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Project Memberships
          </h3>
          <DataTable>
            <Thead>
              <tr>
                <Th>Project</Th>
                <Th>Role</Th>
              </tr>
            </Thead>
            <tbody>
              {user.memberships.map((m) => (
                <tr
                  key={m.project_id}
                  className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/projects/${m.project_id}`)}
                >
                  <Td>{m.project_name}</Td>
                  <Td>
                    <Badge>{m.role}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      )}

      <ConfirmModal
        open={modal.open}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        confirmVariant={modal.variant}
        onConfirm={executeModal}
        onCancel={() => setModal((m) => ({ ...m, open: false }))}
        loading={modalLoading}
      />
    </div>
  );
}

function MilestoneBadgeDisplay({ badge }: { badge: string }) {
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
