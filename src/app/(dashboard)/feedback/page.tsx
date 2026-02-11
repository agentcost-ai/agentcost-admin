"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listFeedback,
  updateFeedback,
  getFeedbackDetail,
  type AdminFeedback,
  type AdminFeedbackDetail,
} from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/utils";
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
  SearchInput,
} from "@/components/ui/shared";
import { X, Send, ChevronRight, Paperclip, FileText } from "lucide-react";

const STATUS_OPTIONS = [
  "open",
  "in_progress",
  "completed",
  "rejected",
] as const;
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"] as const;
const TYPE_OPTIONS = [
  "feature_request",
  "bug_report",
  "model_request",
  "performance_issue",
  "security_report",
  "general",
] as const;

function statusVariant(s: string) {
  const map: Record<
    string,
    "warning" | "info" | "success" | "danger" | "default"
  > = {
    open: "warning",
    in_progress: "info",
    completed: "success",
    rejected: "danger",
  };
  return map[s] ?? "default";
}

function priorityVariant(p: string) {
  const map: Record<string, "danger" | "warning" | "info" | "default"> = {
    critical: "danger",
    high: "warning",
    medium: "info",
    low: "default",
  };
  return map[p] ?? "default";
}

function typeLabel(t: string) {
  return t.replace(/_/g, " ");
}

export default function FeedbackPage() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<AdminFeedbackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listFeedback({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        type: typeFilter || undefined,
        search: search || undefined,
        limit,
        offset,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load feedback:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, typeFilter, search, offset]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, priorityFilter, typeFilter, search]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const detail = await getFeedbackDetail(id);
      setSelected(detail);
    } catch (err) {
      console.error("Failed to load feedback detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="Feedback Management"
        description={`${total} feedback items`}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search title or description..."
          className="w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
        >
          <option value="">All types</option>
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState message="No feedback matches the current filters." />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Submitter</Th>
              <Th>Created</Th>
              <Th className="text-right">Detail</Th>
            </tr>
          </Thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                onClick={() => openDetail(item.id)}
              >
                <Td>
                  <div className="max-w-xs truncate font-medium text-zinc-200">
                    {item.title}
                  </div>
                  {item.admin_response && (
                    <div className="text-[11px] text-emerald-500 mt-0.5">
                      Responded
                    </div>
                  )}
                </Td>
                <Td>
                  <Badge variant="info">{typeLabel(item.type)}</Badge>
                </Td>
                <Td>
                  <Badge variant={statusVariant(item.status)}>
                    {item.status.replace(/_/g, " ")}
                  </Badge>
                </Td>
                <Td>
                  <Badge variant={priorityVariant(item.priority)}>
                    {item.priority}
                  </Badge>
                </Td>
                <Td className="text-xs text-zinc-400">
                  {item.user_email || "--"}
                </Td>
                <Td className="text-xs text-zinc-500">
                  {timeAgo(item.created_at)}
                </Td>
                <Td className="text-right">
                  <ChevronRight className="w-4 h-4 text-zinc-600 inline" />
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>
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

      {/* Detail side panel */}
      {(selected || detailLoading) && (
        <FeedbackDetailPanel
          feedback={selected}
          loading={detailLoading}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            fetchData();
            if (selected) openDetail(selected.id);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail side panel
// ---------------------------------------------------------------------------

function FeedbackDetailPanel({
  feedback,
  loading,
  onClose,
  onUpdated,
}: {
  feedback: AdminFeedbackDetail | null;
  loading: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (feedback) {
      setNewStatus(feedback.status);
      setNewPriority(feedback.priority);
      setResponse("");
    }
  }, [feedback]);

  async function handleSave() {
    if (!feedback) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      if (newStatus !== feedback.status) payload.status = newStatus;
      if (newPriority !== feedback.priority) payload.priority = newPriority;
      if (response.trim()) payload.admin_response = response.trim();

      if (Object.keys(payload).length === 0) return;

      await updateFeedback(feedback.id, payload);
      onUpdated();
    } catch (err) {
      console.error("Failed to update feedback:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-zinc-950 border-l border-zinc-800/50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800/50 px-5 py-4 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
              Feedback Detail
            </div>
            <h2 className="text-sm font-semibold text-zinc-100 truncate">
              {feedback?.title ?? "Loading..."}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading || !feedback ? (
          <div className="p-5">
            <LoadingState />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{typeLabel(feedback.type)}</Badge>
              <Badge variant={statusVariant(feedback.status)}>
                {feedback.status.replace(/_/g, " ")}
              </Badge>
              <Badge variant={priorityVariant(feedback.priority)}>
                {feedback.priority}
              </Badge>
              {feedback.upvotes > 0 && (
                <Badge>
                  {feedback.upvotes} upvote{feedback.upvotes !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {/* Description */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                Description
              </div>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5">
                {feedback.description}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3">
              <MetaItem label="Submitter" value={feedback.user_email || "--"} />
              <MetaItem label="Name" value={feedback.user_name || "--"} />
              <MetaItem
                label="Created"
                value={formatDate(feedback.created_at)}
              />
              <MetaItem
                label="Environment"
                value={feedback.environment || "--"}
              />
              {feedback.model_name && (
                <>
                  <MetaItem label="Model" value={feedback.model_name} />
                  <MetaItem
                    label="Provider"
                    value={feedback.model_provider || "--"}
                  />
                </>
              )}
            </div>

            {/* Attachments */}
            {feedback.attachments && feedback.attachments.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Attachments ({feedback.attachments.length})
                </div>
                <div className="space-y-1.5">
                  {feedback.attachments.map((att, idx) => {
                    const url = String(att.url || att.file_url || "");
                    const name = String(
                      att.filename || att.name || `Attachment ${idx + 1}`,
                    );
                    const size = att.size
                      ? `${(Number(att.size) / 1024).toFixed(1)} KB`
                      : null;
                    const mime = String(
                      att.content_type || att.mime_type || "",
                    );
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-400 hover:text-blue-300 truncate block"
                            >
                              {name}
                            </a>
                          ) : (
                            <span className="text-sm text-zinc-300 truncate block">
                              {name}
                            </span>
                          )}
                          <div className="flex items-center gap-2 mt-0.5">
                            {mime && (
                              <span className="text-[11px] text-zinc-600">
                                {mime}
                              </span>
                            )}
                            {size && (
                              <span className="text-[11px] text-zinc-600">
                                {size}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Client Metadata */}
            {feedback.client_metadata &&
              Object.keys(feedback.client_metadata).length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                    Client Metadata
                  </div>
                  <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5">
                    <div className="space-y-1">
                      {Object.entries(feedback.client_metadata).map(
                        ([key, val]) => (
                          <div
                            key={key}
                            className="flex items-start gap-2 text-xs"
                          >
                            <span className="text-zinc-500 font-mono shrink-0">
                              {key}:
                            </span>
                            <span className="text-zinc-300 break-all">
                              {typeof val === "object"
                                ? JSON.stringify(val)
                                : String(val)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Existing admin response */}
            {feedback.admin_response && (
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                  Previous Response
                </div>
                <div className="text-sm text-emerald-300 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3.5 whitespace-pre-wrap">
                  {feedback.admin_response}
                </div>
                <div className="text-[11px] text-zinc-600 mt-1">
                  Responded {timeAgo(feedback.admin_responded_at)}
                </div>
              </div>
            )}

            {/* Admin actions */}
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500">
                Update
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-blue-500/50"
                  >
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Admin Response (sent via email to user)
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  placeholder="Write a response..."
                  className="w-full px-3 py-2 text-sm bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {/* Event history */}
            {feedback.events.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                  History
                </div>
                <div className="space-y-1.5">
                  {feedback.events.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-start gap-2 text-xs text-zinc-400"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="text-zinc-300 font-medium">
                          {ev.event_type.replace(/_/g, " ")}
                        </span>
                        {ev.new_value && (
                          <span className="ml-1 text-zinc-500">
                            {JSON.stringify(ev.new_value)}
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-600 shrink-0">
                        {timeAgo(ev.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {feedback.comments.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                  Comments ({feedback.comments.length})
                </div>
                <div className="space-y-2">
                  {feedback.comments.map((c) => (
                    <div
                      key={c.id}
                      className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3.5"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-zinc-300">
                          {c.user_name || "Anonymous"}
                        </span>
                        {c.is_admin && <Badge variant="info">Admin</Badge>}
                        {c.is_internal && (
                          <Badge variant="warning">Internal</Badge>
                        )}
                        <span className="text-[11px] text-zinc-600 ml-auto">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-400">{c.comment}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-600">{label}</div>
      <div className="text-sm text-zinc-300 truncate">{value}</div>
    </div>
  );
}
