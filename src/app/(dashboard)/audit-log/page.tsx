"use client";

import { useEffect, useState, useCallback } from "react";
import { getAdminAuditLog, type AdminAuditEntry } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import {
  PageHeader,
  Badge,
  DataTable,
  Thead,
  Th,
  Td,
  LoadingState,
  EmptyState,
  Pagination,
} from "@/components/ui/shared";

const ACTION_TYPE_LABELS: Record<string, string> = {
  user_updated: "User Updated",
  user_disabled: "User Disabled",
  user_deleted: "User Deleted",
  sessions_revoked: "Sessions Revoked",
  admin_notes_updated: "Admin Notes Updated",
  email_sent: "Email Sent",
  project_frozen: "Project Frozen",
  project_resumed: "Project Resumed",
  project_key_rotated: "API Key Rotated",
  project_key_revoked: "API Key Revoked",
  feedback_updated: "Feedback Updated",
};

const TARGET_TYPE_VARIANTS: Record<
  string,
  "info" | "warning" | "success" | "danger" | "default"
> = {
  user: "info",
  project: "warning",
  feedback: "success",
  system: "danger",
};

function actionLabel(type: string): string {
  return ACTION_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export default function AuditLogPage() {
  const [items, setItems] = useState<AdminAuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminAuditLog({
        action_type: actionFilter || undefined,
        target_type: targetFilter || undefined,
        limit,
        offset,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load audit log:", err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, targetFilter, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [actionFilter, targetFilter]);

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="Audit Log"
        description="Immutable record of all admin operations"
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <select
          value={targetFilter}
          onChange={(e) => setTargetFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All targets</option>
          <option value="user">User</option>
          <option value="project">Project</option>
          <option value="feedback">Feedback</option>
          <option value="system">System</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState message="No audit log entries match the current filters." />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Timestamp</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>Admin</Th>
              <Th>Details</Th>
              <Th>IP</Th>
            </tr>
          </Thead>
          <tbody>
            {items.map((entry) => (
              <tr
                key={entry.id}
                className="hover:bg-zinc-800/20 transition-colors"
              >
                <Td className="text-xs text-zinc-500 whitespace-nowrap">
                  {timeAgo(entry.created_at)}
                </Td>
                <Td>
                  <span className="text-sm text-zinc-200">
                    {actionLabel(entry.action_type)}
                  </span>
                </Td>
                <Td>
                  {entry.target_type && (
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          TARGET_TYPE_VARIANTS[entry.target_type] ?? "default"
                        }
                      >
                        {entry.target_type}
                      </Badge>
                      {entry.target_id && (
                        <span className="font-mono text-[11px] text-zinc-500">
                          {entry.target_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  )}
                </Td>
                <Td className="text-xs text-zinc-400">
                  {entry.admin_email || "--"}
                </Td>
                <Td>
                  {entry.details && Object.keys(entry.details).length > 0 ? (
                    <DetailsCell details={entry.details} />
                  ) : (
                    <span className="text-xs text-zinc-600">--</span>
                  )}
                </Td>
                <Td className="text-xs text-zinc-600 font-mono">
                  {entry.ip_address || "--"}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>
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
    </div>
  );
}

function DetailsCell({ details }: { details: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false);
  const keys = Object.keys(details);
  const preview = keys
    .slice(0, 2)
    .map((k) => `${k}: ${String(details[k])}`)
    .join(", ");

  if (keys.length <= 2 && preview.length < 60) {
    return <span className="text-xs text-zinc-400 font-mono">{preview}</span>;
  }

  return (
    <div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        {expanded ? "Collapse" : `${keys.length} fields -- expand`}
      </button>
      {expanded && (
        <pre className="mt-1 text-[11px] text-zinc-500 font-mono bg-zinc-900/50 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </div>
  );
}
