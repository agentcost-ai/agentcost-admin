"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getProjectDetail,
  updateProject,
  rotateProjectKey,
  revokeProjectKey,
  type ProjectDetail,
} from "@/lib/api";
import { formatDate, formatNumber, formatCost, timeAgo } from "@/lib/utils";
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
import { ArrowLeft, RotateCw, Ban, Pause, Play } from "lucide-react";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant?: "danger" | "primary";
  }>({ open: false, title: "", message: "", action: async () => {} });
  const [modalLoading, setModalLoading] = useState(false);

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProjectDetail(projectId);
      setProject(data);
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function executeModal() {
    setModalLoading(true);
    try {
      await modal.action();
      loadProject();
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setModalLoading(false);
      setModal((m) => ({ ...m, open: false }));
    }
  }

  if (loading)
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );
  if (!project)
    return <div className="p-6 text-sm text-zinc-500">Project not found</div>;

  return (
    <div className="p-6 max-w-350">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 mb-4 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" /> Back
      </button>

      <PageHeader
        title={project.name}
        description={project.description || "No description"}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setModal({
                  open: true,
                  title: project.is_active
                    ? "Freeze Ingestion"
                    : "Resume Ingestion",
                  message: project.is_active
                    ? "Freeze this project? SDK will receive 403 errors."
                    : "Resume ingestion for this project?",
                  variant: project.is_active ? "danger" : "primary",
                  action: async () => {
                    await updateProject(projectId, {
                      is_active: !project.is_active,
                    });
                  },
                })
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border transition-colors ${
                project.is_active
                  ? "text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              }`}
            >
              {project.is_active ? (
                <>
                  <Pause className="w-3 h-3" /> Freeze
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" /> Resume
                </>
              )}
            </button>
            <button
              onClick={() =>
                setModal({
                  open: true,
                  title: "Rotate API Key",
                  message:
                    "Generate a new key? The current one becomes invalid immediately.",
                  variant: "danger",
                  action: async () => {
                    await rotateProjectKey(projectId);
                  },
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded hover:text-zinc-200 transition-colors"
            >
              <RotateCw className="w-3 h-3" /> Rotate Key
            </button>
            <button
              onClick={() =>
                setModal({
                  open: true,
                  title: "Revoke Key & Deactivate",
                  message:
                    "Revoke the key and deactivate this project entirely?",
                  variant: "danger",
                  action: async () => {
                    await revokeProjectKey(projectId);
                  },
                })
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10 transition-colors"
            >
              <Ban className="w-3 h-3" /> Revoke
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <Badge variant={project.is_active ? "success" : "danger"}>
          {project.is_active ? "Active" : "Frozen"}
        </Badge>
        {project.key_prefix && (
          <code className="text-[11px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">
            {project.key_prefix}
          </code>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Events"
          value={formatNumber(project.usage.total_events)}
        />
        <StatCard
          label="Total Tokens"
          value={formatNumber(project.usage.total_tokens)}
        />
        <StatCard
          label="Total Cost"
          value={formatCost(project.usage.total_cost)}
        />
        <StatCard label="Members" value={project.members.length} />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="border border-zinc-800/50 rounded-xl p-5 bg-zinc-900/30">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Project Info
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">ID</span>
              <span className="font-mono text-xs text-zinc-400">
                {project.id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Owner</span>
              <span className="text-zinc-300">
                {project.owner
                  ? `${project.owner.email}${project.owner.name ? ` (${project.owner.name})` : ""}`
                  : "--"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Key Created</span>
              <span className="text-zinc-300">
                {formatDate(project.key_created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">First Event</span>
              <span className="text-zinc-300">
                {formatDate(project.usage.first_event_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Last Ingestion</span>
              <span className="text-zinc-300">
                {timeAgo(project.usage.last_event_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Members */}
      {project.members.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">
            Members
          </h3>
          <DataTable>
            <Thead>
              <tr>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Role</Th>
              </tr>
            </Thead>
            <tbody>
              {project.members.map((m) => (
                <tr
                  key={m.user_id}
                  className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/users/${m.user_id}`)}
                >
                  <Td className="font-mono text-xs">{m.email}</Td>
                  <Td>{m.name || "--"}</Td>
                  <Td>
                    <Badge
                      variant={
                        m.role === "admin"
                          ? "warning"
                          : m.role === "member"
                            ? "info"
                            : "default"
                      }
                    >
                      {m.role}
                    </Badge>
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
        confirmVariant={modal.variant}
        onConfirm={executeModal}
        onCancel={() => setModal((m) => ({ ...m, open: false }))}
        loading={modalLoading}
      />
    </div>
  );
}
