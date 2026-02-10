"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getFailedEvents,
  getFeedbackIncidents,
  type FailedEvent,
  type FeedbackIncident,
} from "@/lib/api";
import { formatDateTime, formatCost } from "@/lib/utils";
import {
  PageHeader,
  DataTable,
  Thead,
  Th,
  Td,
  Badge,
  Pagination,
  LoadingState,
  EmptyState,
} from "@/components/ui/shared";

type Tab = "failed" | "feedback";

export default function IncidentsPage() {
  const [tab, setTab] = useState<Tab>("failed");
  const [failedEvents, setFailedEvents] = useState<FailedEvent[]>([]);
  const [failedTotal, setFailedTotal] = useState(0);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackIncident[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "failed") {
        const data = await getFailedEvents({ limit, offset });
        setFailedEvents(data.items);
        setFailedTotal(data.total);
      } else {
        const data = await getFeedbackIncidents({ limit, offset });
        setFeedbackItems(data.items);
        setFeedbackTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  }, [tab, offset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function switchTab(t: Tab) {
    setTab(t);
    setOffset(0);
  }

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="Incidents"
        description="Failed events and user-reported issues"
      />

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-5 border-b border-zinc-800/50">
        {(
          [
            { key: "failed", label: "Failed Events", count: failedTotal },
            {
              key: "feedback",
              label: "Feedback Reports",
              count: feedbackTotal,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : tab === "failed" ? (
        failedEvents.length === 0 ? (
          <EmptyState message="No failed events found" />
        ) : (
          <DataTable>
            <Thead>
              <tr>
                <Th>ID</Th>
                <Th>Project</Th>
                <Th>Model</Th>
                <Th>Agent</Th>
                <Th>Error</Th>
                <Th>Timestamp</Th>
              </tr>
            </Thead>
            <tbody>
              {failedEvents.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-800/30">
                  <Td>
                    <span className="font-mono text-[11px] text-zinc-400">
                      #{typeof e.id === "string" ? e.id.substring(0, 8) : e.id}
                    </span>
                  </Td>
                  <Td className="text-xs text-zinc-300">{e.project_name}</Td>
                  <Td>
                    <span className="font-mono text-xs text-zinc-200">
                      {e.model}
                    </span>
                  </Td>
                  <Td className="text-xs text-zinc-400">
                    {e.agent_name || "--"}
                  </Td>
                  <Td className="max-w-xs">
                    <span className="text-xs text-red-400 truncate block">
                      {e.error || "No error message"}
                    </span>
                  </Td>
                  <Td className="text-xs text-zinc-500">
                    {e.timestamp ? formatDateTime(e.timestamp) : "--"}
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6}>
                  <Pagination
                    total={failedTotal}
                    limit={limit}
                    offset={offset}
                    onPageChange={setOffset}
                  />
                </td>
              </tr>
            </tfoot>
          </DataTable>
        )
      ) : feedbackItems.length === 0 ? (
        <EmptyState message="No feedback reports found" />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>ID</Th>
              <Th>Type</Th>
              <Th>Title</Th>
              <Th>Status</Th>
              <Th>Priority</Th>
              <Th>Email</Th>
              <Th>Submitted</Th>
            </tr>
          </Thead>
          <tbody>
            {feedbackItems.map((f) => (
              <tr key={f.id} className="hover:bg-zinc-800/30">
                <Td className="text-xs text-zinc-500 font-mono">#{f.id}</Td>
                <Td>
                  <Badge
                    variant={
                      f.type === "bug_report"
                        ? "danger"
                        : f.type === "security_report"
                          ? "warning"
                          : "default"
                    }
                  >
                    {f.type}
                  </Badge>
                </Td>
                <Td className="max-w-sm">
                  <span className="text-xs text-zinc-200 truncate block">
                    {f.title || "--"}
                  </span>
                  {f.description && (
                    <span className="text-[11px] text-zinc-500 truncate block mt-0.5">
                      {f.description}
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge
                    variant={
                      f.status === "resolved"
                        ? "success"
                        : f.status === "in_progress"
                          ? "info"
                          : "default"
                    }
                  >
                    {f.status || "open"}
                  </Badge>
                </Td>
                <Td>
                  <Badge
                    variant={
                      f.priority === "critical"
                        ? "danger"
                        : f.priority === "high"
                          ? "warning"
                          : "default"
                    }
                  >
                    {f.priority || "normal"}
                  </Badge>
                </Td>
                <Td className="text-xs text-zinc-400">
                  {f.user_email || "Anonymous"}
                </Td>
                <Td className="text-xs text-zinc-500">
                  {f.created_at ? formatDateTime(f.created_at) : "--"}
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>
                <Pagination
                  total={feedbackTotal}
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
