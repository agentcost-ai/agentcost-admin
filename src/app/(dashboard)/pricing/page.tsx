"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listPricingModels,
  listPricingProviders,
  updateModelPricing,
  syncLitellmPricing,
  syncOpenrouterPricing,
  getPricingSyncHistory,
  type PricingModel,
  type ProviderSummary,
  type PricingSyncLogEntry,
} from "@/lib/api";
import { formatDate, formatDateTime, timeAgo } from "@/lib/utils";
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
  SectionCard,
} from "@/components/ui/shared";
import {
  Edit3,
  X,
  Check,
  Download,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowUpDown,
  Zap,
} from "lucide-react";

export default function PricingPage() {
  const [models, setModels] = useState<PricingModel[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [showSyncDetail, setShowSyncDetail] = useState(false);
  const [syncHistory, setSyncHistory] = useState<PricingSyncLogEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const limit = 100;

  // Edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState("");
  const [editOutput, setEditOutput] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [modelsData, providersData] = await Promise.all([
        listPricingModels({
          search: search || undefined,
          provider: providerFilter || undefined,
          limit,
          offset,
        }),
        listPricingProviders(),
      ]);
      setModels(modelsData.items);
      setTotal(modelsData.total);
      setProviders(providersData);
    } catch (err) {
      console.error("Failed to load pricing:", err);
    } finally {
      setLoading(false);
    }
  }, [search, providerFilter, offset]);

  useEffect(() => {
    const t = setTimeout(() => loadData(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [loadData, search]);

  async function loadSyncHistory() {
    setHistoryLoading(true);
    try {
      const res = await getPricingSyncHistory({ limit: 10 });
      setSyncHistory(res.items);
    } catch (err) {
      console.error("Failed to load sync history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSync(source: "litellm" | "openrouter") {
    setSyncing(source);
    setSyncResult(null);
    setShowSyncDetail(false);
    try {
      const result =
        source === "litellm"
          ? await syncLitellmPricing()
          : await syncOpenrouterPricing();
      setSyncResult(result);
      setShowSyncDetail(true);
      loadData();
      if (showHistory) loadSyncHistory();
    } catch (err) {
      setSyncResult({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      setShowSyncDetail(true);
    } finally {
      setSyncing(null);
    }
  }

  function startEdit(m: PricingModel) {
    setEditId(m.id);
    setEditInput(String(m.input_price_per_1k));
    setEditOutput(String(m.output_price_per_1k));
  }

  async function saveEdit() {
    if (editId === null) return;
    setSaving(true);
    try {
      await updateModelPricing(editId, {
        input_price_per_1k: parseFloat(editInput),
        output_price_per_1k: parseFloat(editOutput),
      });
      setEditId(null);
      loadData();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="Pricing Intelligence"
        description={`${total} model pricing records`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowHistory(!showHistory);
                if (!showHistory) loadSyncHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-lg hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              <Clock className="w-3 h-3" />
              Sync History
            </button>
            <button
              onClick={() => handleSync("litellm")}
              disabled={syncing !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-lg hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {syncing === "litellm" ? "Syncing..." : "Sync LiteLLM"}
            </button>
            <button
              onClick={() => handleSync("openrouter")}
              disabled={syncing !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-lg hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-3 h-3" />
              {syncing === "openrouter" ? "Syncing..." : "Sync OpenRouter"}
            </button>
          </div>
        }
      />

      {/* Sync Result Detail */}
      {syncResult && showSyncDetail && (
        <SyncResultPanel
          result={syncResult}
          onClose={() => setShowSyncDetail(false)}
        />
      )}

      {/* Sync History Panel */}
      {showHistory && (
        <div className="mb-6">
          <SectionCard
            title="Sync History"
            description="Recent pricing synchronization operations"
          >
            {historyLoading ? (
              <LoadingState />
            ) : syncHistory.length === 0 ? (
              <p className="text-sm text-zinc-500">No sync history yet.</p>
            ) : (
              <div className="space-y-2">
                {syncHistory.map((entry) => (
                  <SyncHistoryEntry key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* Provider summary */}
      {providers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Provider Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {providers.slice(0, 12).map((p) => (
              <button
                key={p.provider}
                onClick={() => {
                  setProviderFilter(
                    providerFilter === p.provider ? "" : p.provider,
                  );
                  setOffset(0);
                }}
                className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  providerFilter === p.provider
                    ? "bg-blue-500/10 border-blue-500/25 text-blue-400"
                    : "border-zinc-800/50 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="text-xs font-medium capitalize">
                  {p.provider}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {p.model_count} models
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setOffset(0);
          }}
          placeholder="Search models..."
          className="w-72"
        />
        {providerFilter && (
          <button
            onClick={() => {
              setProviderFilter("");
              setOffset(0);
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg"
          >
            {providerFilter} <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading && !models.length ? (
        <LoadingState />
      ) : models.length === 0 ? (
        <EmptyState message="No pricing models found" />
      ) : (
        <DataTable>
          <Thead>
            <tr>
              <Th>Model</Th>
              <Th>Provider</Th>
              <Th>Input $/1K</Th>
              <Th>Output $/1K</Th>
              <Th>Source</Th>
              <Th>Max Tokens</Th>
              <Th>Capabilities</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                <Td>
                  <span className="font-mono text-xs text-zinc-200">
                    {m.model_name}
                  </span>
                </Td>
                <Td>
                  <Badge>{m.provider}</Badge>
                </Td>
                <Td>
                  {editId === m.id ? (
                    <input
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      className="w-24 px-1.5 py-0.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                    />
                  ) : (
                    <span className="font-mono text-xs">
                      ${m.input_price_per_1k.toFixed(6)}
                    </span>
                  )}
                </Td>
                <Td>
                  {editId === m.id ? (
                    <input
                      value={editOutput}
                      onChange={(e) => setEditOutput(e.target.value)}
                      className="w-24 px-1.5 py-0.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200"
                    />
                  ) : (
                    <span className="font-mono text-xs">
                      ${m.output_price_per_1k.toFixed(6)}
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge
                    variant={
                      m.pricing_source === "admin_override"
                        ? "warning"
                        : m.pricing_source === "litellm"
                          ? "info"
                          : "default"
                    }
                  >
                    {m.pricing_source}
                  </Badge>
                </Td>
                <Td className="text-xs text-zinc-500">
                  {m.max_tokens ? m.max_tokens.toLocaleString() : "--"}
                </Td>
                <Td>
                  <div className="flex gap-1">
                    {m.supports_vision && <Badge variant="info">Vision</Badge>}
                    {m.supports_function_calling && (
                      <Badge variant="info">Functions</Badge>
                    )}
                  </div>
                </Td>
                <Td className="text-xs text-zinc-500">
                  {formatDate(m.updated_at)}
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    {editId === m.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(m)}
                        className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                        title="Edit pricing"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9}>
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

// ---------------------------------------------------------------------------
// Sync Result Panel -- detailed breakdown of what happened
// ---------------------------------------------------------------------------

function SyncResultPanel({
  result,
  onClose,
}: {
  result: Record<string, unknown>;
  onClose: () => void;
}) {
  const isError = result.status === "error";
  const changes = (result.changes as Record<string, unknown[]>) || {};
  const newModels = (changes.new_models || []) as Record<string, unknown>[];
  const priceChanges = (changes.price_changes || []) as Record<
    string,
    unknown
  >[];
  const capChanges = (changes.capability_changes || []) as Record<
    string,
    unknown
  >[];

  const hasChanges =
    newModels.length > 0 || priceChanges.length > 0 || capChanges.length > 0;

  return (
    <div
      className={`mb-5 border rounded-xl overflow-hidden ${
        isError
          ? "bg-red-500/5 border-red-500/20"
          : "bg-zinc-900/40 border-zinc-800/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/30">
        <div className="flex items-center gap-3">
          {isError ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          )}
          <div>
            <div className="text-sm font-medium text-zinc-200">
              {isError
                ? "Sync Failed"
                : `Sync Complete -- ${String(result.source || "").toUpperCase()}`}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {isError
                ? String(result.error || "Unknown error")
                : `Created: ${result.models_created ?? 0} | Updated: ${result.models_updated ?? 0} | Skipped: ${result.models_skipped ?? 0} | Duration: ${result.duration_ms ?? "--"}ms`}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Change details */}
      {!isError && hasChanges && (
        <div className="p-4 space-y-4">
          {/* New models */}
          {newModels.length > 0 && (
            <ChangeSection
              icon={<Plus className="w-3.5 h-3.5 text-emerald-400" />}
              title={`${newModels.length} New Model${newModels.length !== 1 ? "s" : ""} Added`}
              variant="success"
            >
              <div className="grid grid-cols-1 gap-1">
                {newModels.slice(0, 20).map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-zinc-900/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-200">
                        {String(m.model)}
                      </span>
                      <Badge>{String(m.provider)}</Badge>
                    </div>
                    <div className="text-zinc-500 font-mono">
                      ${Number(m.input_price ?? 0).toFixed(6)} / $
                      {Number(m.output_price ?? 0).toFixed(6)}
                    </div>
                  </div>
                ))}
                {newModels.length > 20 && (
                  <div className="text-[11px] text-zinc-500 px-2 pt-1">
                    ...and {newModels.length - 20} more
                  </div>
                )}
              </div>
            </ChangeSection>
          )}

          {/* Price changes */}
          {priceChanges.length > 0 && (
            <ChangeSection
              icon={<ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />}
              title={`${priceChanges.length} Price Change${priceChanges.length !== 1 ? "s" : ""}`}
              variant="warning"
            >
              <div className="grid grid-cols-1 gap-1">
                {priceChanges.slice(0, 20).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-zinc-900/40"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-200">
                        {String(c.model)}
                      </span>
                      <Badge>{String(c.provider)}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400 font-mono">
                      <span>
                        In: ${Number(c.old_input ?? 0).toFixed(6)} &rarr; $
                        {Number(c.new_input ?? 0).toFixed(6)}
                        <span
                          className={
                            Number(c.input_change_pct ?? 0) > 0
                              ? "text-red-400 ml-1"
                              : "text-emerald-400 ml-1"
                          }
                        >
                          ({Number(c.input_change_pct ?? 0) > 0 ? "+" : ""}
                          {Number(c.input_change_pct ?? 0).toFixed(1)}%)
                        </span>
                      </span>
                      <span>
                        Out: ${Number(c.old_output ?? 0).toFixed(6)} &rarr; $
                        {Number(c.new_output ?? 0).toFixed(6)}
                        <span
                          className={
                            Number(c.output_change_pct ?? 0) > 0
                              ? "text-red-400 ml-1"
                              : "text-emerald-400 ml-1"
                          }
                        >
                          ({Number(c.output_change_pct ?? 0) > 0 ? "+" : ""}
                          {Number(c.output_change_pct ?? 0).toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
                {priceChanges.length > 20 && (
                  <div className="text-[11px] text-zinc-500 px-2 pt-1">
                    ...and {priceChanges.length - 20} more
                  </div>
                )}
              </div>
            </ChangeSection>
          )}

          {/* Capability changes */}
          {capChanges.length > 0 && (
            <ChangeSection
              icon={<Zap className="w-3.5 h-3.5 text-blue-400" />}
              title={`${capChanges.length} Capability Change${capChanges.length !== 1 ? "s" : ""}`}
              variant="info"
            >
              <div className="grid grid-cols-1 gap-1">
                {capChanges.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-zinc-900/40"
                  >
                    <span className="font-mono text-zinc-200">
                      {String(c.model)}
                    </span>
                    <span className="text-zinc-400">
                      {String(c.change)}:{" "}
                      <span className="text-red-400">{String(c.old)}</span>{" "}
                      &rarr;{" "}
                      <span className="text-emerald-400">{String(c.new)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </ChangeSection>
          )}
        </div>
      )}

      {!isError && !hasChanges && (
        <div className="px-4 py-3 text-sm text-zinc-500">
          No significant changes detected (price changes &lt; 1% are excluded).
        </div>
      )}
    </div>
  );
}

function ChangeSection({
  icon,
  title,
  variant,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  variant: "success" | "warning" | "info";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const borderColors = {
    success: "border-emerald-500/20",
    warning: "border-amber-500/20",
    info: "border-blue-500/20",
  };

  return (
    <div className={`border rounded-lg ${borderColors[variant]}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
      >
        {icon}
        <span className="text-xs font-medium text-zinc-300 flex-1">
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sync History Entry
// ---------------------------------------------------------------------------

function SyncHistoryEntry({ entry }: { entry: PricingSyncLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails =
    (entry.new_models && entry.new_models.length > 0) ||
    (entry.price_changes && entry.price_changes.length > 0) ||
    (entry.capability_changes && entry.capability_changes.length > 0);

  return (
    <div className="border border-zinc-800/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-zinc-800/20 transition-colors"
      >
        <Badge
          variant={
            entry.status === "ok"
              ? "success"
              : entry.status === "error"
                ? "danger"
                : "warning"
          }
        >
          {entry.status}
        </Badge>
        <Badge>{entry.source}</Badge>
        <div className="flex-1 text-xs text-zinc-400">
          +{entry.models_created} created, ~{entry.models_updated} updated
          {entry.duration_ms != null && (
            <span className="text-zinc-600 ml-2">{entry.duration_ms}ms</span>
          )}
        </div>
        <span className="text-[11px] text-zinc-600">
          {timeAgo(entry.created_at)}
        </span>
        {hasDetails &&
          (expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          ))}
      </button>
      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-800/30 space-y-2">
          {entry.error_message && (
            <div className="text-xs text-red-400 bg-red-500/5 rounded px-2 py-1.5">
              {entry.error_message}
            </div>
          )}
          {entry.new_models && entry.new_models.length > 0 && (
            <div>
              <div className="text-[11px] text-emerald-400 font-medium mb-1">
                New Models ({entry.new_models.length})
              </div>
              <div className="space-y-0.5">
                {entry.new_models.slice(0, 10).map((m, i) => (
                  <div key={i} className="text-[11px] text-zinc-400 font-mono">
                    {String((m as Record<string, unknown>).model)} --{" "}
                    {String((m as Record<string, unknown>).provider)}
                  </div>
                ))}
                {entry.new_models.length > 10 && (
                  <div className="text-[11px] text-zinc-600">
                    +{entry.new_models.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
          {entry.price_changes && entry.price_changes.length > 0 && (
            <div>
              <div className="text-[11px] text-amber-400 font-medium mb-1">
                Price Changes ({entry.price_changes.length})
              </div>
              <div className="space-y-0.5">
                {entry.price_changes.slice(0, 10).map((c, i) => {
                  const change = c as Record<string, unknown>;
                  return (
                    <div
                      key={i}
                      className="text-[11px] text-zinc-400 font-mono"
                    >
                      {String(change.model)} -- Input:{" "}
                      {Number(change.input_change_pct ?? 0) > 0 ? "+" : ""}
                      {Number(change.input_change_pct ?? 0).toFixed(1)}%,
                      Output:{" "}
                      {Number(change.output_change_pct ?? 0) > 0 ? "+" : ""}
                      {Number(change.output_change_pct ?? 0).toFixed(1)}%
                    </div>
                  );
                })}
                {entry.price_changes.length > 10 && (
                  <div className="text-[11px] text-zinc-600">
                    +{entry.price_changes.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
