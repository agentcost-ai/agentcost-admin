"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  listProjects,
  updateProject,
  rotateProjectKey,
  revokeProjectKey,
  type AdminProject,
} from "@/lib/api";
import { formatDate, formatNumber, timeAgo } from "@/lib/utils";
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
import { Eye, RotateCw, Ban, Play, Pause } from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant?: "danger" | "primary";
  }>({ open: false, title: "", message: "", action: async () => {} });
  const [modalLoading, setModalLoading] = useState(false);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listProjects({
        search: search || undefined,
        limit,
        offset,
      });
      setProjects(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    const t = setTimeout(() => loadProjects(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadProjects, search]);

  async function executeModal() {
    setModalLoading(true);
    try {
      await modal.action();
      loadProjects();
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
        title="Projects & API Keys"
        description={`${total} total projects`}
      />

      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setOffset(0);
          }}
          placeholder="Search by name or owner email..."
          className="w-72"
        />
      </div>

      {loading && !projects.length ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState message="No projects found" />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Name</Th>
              <Th>Owner</Th>
              <Th>Key Prefix</Th>
              <Th>Status</Th>
              <Th>Events</Th>
              <Th>Last Ingestion</Th>
              <Th>Created</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                <Td className="font-medium text-zinc-200">{p.name}</Td>
                <Td className="text-xs font-mono text-zinc-400">
                  {p.owner_email || "--"}
                </Td>
                <Td>
                  <code className="text-[11px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                    {p.key_prefix || "--"}
                  </code>
                </Td>
                <Td>
                  <Badge variant={p.is_active ? "success" : "danger"}>
                    {p.is_active ? "Active" : "Frozen"}
                  </Badge>
                </Td>
                <Td className="font-mono text-xs">
                  {formatNumber(p.event_count)}
                </Td>
                <Td className="text-xs text-zinc-500">
                  {timeAgo(p.last_event_at)}
                </Td>
                <Td className="text-xs text-zinc-500">
                  {formatDate(p.created_at)}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="View details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setModal({
                          open: true,
                          title: p.is_active
                            ? "Freeze Ingestion"
                            : "Resume Ingestion",
                          message: p.is_active
                            ? `Freeze ingestion for "${p.name}"? The SDK will receive 403 errors.`
                            : `Resume ingestion for "${p.name}"?`,
                          variant: p.is_active ? "danger" : "primary",
                          action: async () => {
                            await updateProject(p.id, {
                              is_active: !p.is_active,
                            });
                          },
                        })
                      }
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title={p.is_active ? "Freeze" : "Resume"}
                    >
                      {p.is_active ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        setModal({
                          open: true,
                          title: "Rotate API Key",
                          message: `Generate a new API key for "${p.name}"? The current key will be invalidated immediately.`,
                          variant: "danger",
                          action: async () => {
                            await rotateProjectKey(p.id);
                          },
                        })
                      }
                      className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="Rotate key"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setModal({
                          open: true,
                          title: "Revoke Key & Deactivate",
                          message: `Revoke the API key and deactivate "${p.name}"? This cannot be undone without admin intervention.`,
                          variant: "danger",
                          action: async () => {
                            await revokeProjectKey(p.id);
                          },
                        })
                      }
                      className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                      title="Revoke key"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8}>
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
