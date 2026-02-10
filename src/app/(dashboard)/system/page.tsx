"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getSystemHealth,
  getIngestionStats,
  type SystemHealth,
  type IngestionStat,
} from "@/lib/api";
import { formatNumber, formatDateTime } from "@/lib/utils";
import {
  PageHeader,
  StatCard,
  DataTable,
  Thead,
  Th,
  Td,
  Badge,
  LoadingState,
} from "@/components/ui/shared";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { RefreshCw } from "lucide-react";

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [ingestion, setIngestion] = useState<IngestionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [h, i] = await Promise.all([
        getSystemHealth(),
        getIngestionStats("7d"),
      ]);
      setHealth(h);
      setIngestion(i);
    } catch (err) {
      console.error("Failed to load system data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function refresh() {
    setRefreshing(true);
    loadData();
  }

  if (loading) return <LoadingState />;
  if (!health) return null;

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="System Monitoring"
        description="Infrastructure health and ingestion metrics"
        actions={
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 border border-zinc-800 rounded-lg hover:text-zinc-200 hover:border-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Events (24h)"
          value={formatNumber(health.ingestion.events_24h)}
        />
        <StatCard
          label="Errors (24h)"
          value={formatNumber(health.ingestion.errors_24h)}
        />
        <StatCard
          label="Error Rate (24h)"
          value={`${health.ingestion.error_rate_24h.toFixed(2)}%`}
        />
        <StatCard
          label="Pricing Models"
          value={formatNumber(health.pricing.total_models)}
        />
      </div>

      {/* Table counts & health signals */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Table Row Counts
          </h3>
          <DataTable>
            <Thead>
              <tr>
                <Th>Table</Th>
                <Th className="text-right">Rows</Th>
              </tr>
            </Thead>
            <tbody>
              {Object.entries(health.database.tables).map(([table, count]) => (
                <tr key={table} className="hover:bg-zinc-800/30">
                  <Td>
                    <span className="font-mono text-xs text-zinc-300">
                      {table}
                    </span>
                  </Td>
                  <Td className="text-right font-mono text-xs">
                    {formatNumber(count)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Health Signals
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
              <span className="text-xs text-zinc-400">Status</span>
              <Badge
                variant={
                  health.status === "operational" ? "success" : "warning"
                }
              >
                {health.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
              <span className="text-xs text-zinc-400">Database</span>
              <Badge variant={health.database.connected ? "success" : "danger"}>
                {health.database.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
              <span className="text-xs text-zinc-400">Last Event Ingested</span>
              <span className="text-xs text-zinc-300 font-mono">
                {health.ingestion.last_event_at
                  ? formatDateTime(health.ingestion.last_event_at)
                  : "None"}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
              <span className="text-xs text-zinc-400">Error Rate (24h)</span>
              <Badge
                variant={
                  health.ingestion.error_rate_24h > 10
                    ? "danger"
                    : health.ingestion.error_rate_24h > 5
                      ? "warning"
                      : "success"
                }
              >
                {health.ingestion.error_rate_24h.toFixed(2)}%
              </Badge>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
              <span className="text-xs text-zinc-400">Environment</span>
              <span className="text-xs text-zinc-300 font-mono">
                {health.environment}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
              <span className="text-xs text-zinc-400">Version</span>
              <span className="text-xs text-zinc-300 font-mono">
                {health.version}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ingestion throughput chart */}
      {ingestion.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Ingestion Throughput
          </h3>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ingestion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                <Bar
                  dataKey="total"
                  name="Total Events"
                  fill="#3b82f6"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="failed"
                  name="Failed Events"
                  fill="#ef4444"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
