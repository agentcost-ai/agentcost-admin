"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listPricingModels,
  listPricingProviders,
  updateModelPricing,
  syncLitellmPricing,
  syncOpenrouterPricing,
  type PricingModel,
  type ProviderSummary,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";
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
import { RefreshCw, Edit3, X, Check, Download } from "lucide-react";

export default function PricingPage() {
  const [models, setModels] = useState<PricingModel[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
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

  async function handleSync(source: "litellm" | "openrouter") {
    setSyncing(source);
    setSyncResult(null);
    try {
      const result =
        source === "litellm"
          ? await syncLitellmPricing()
          : await syncOpenrouterPricing();
      const msg = `Sync complete. Created: ${result.models_created ?? 0}, Updated: ${result.models_updated ?? 0}`;
      setSyncResult(msg);
      loadData();
    } catch (err) {
      setSyncResult(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
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

      {syncResult && (
        <div className="mb-5 px-4 py-2.5 text-xs bg-blue-500/8 border border-blue-500/20 rounded-xl text-blue-400">
          {syncResult}
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
