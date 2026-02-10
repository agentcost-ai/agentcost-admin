"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getPlatformStats,
  getPlatformTimeseries,
  type PlatformStats,
  type TimeseriesPoint,
} from "@/lib/api";
import { formatNumber, formatCost } from "@/lib/utils";
import {
  StatCard,
  PageHeader,
  LoadingState,
  SectionCard,
} from "@/components/ui/shared";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RefreshCw } from "lucide-react";

const TOOLTIP_STYLE = {
  background: "#18181b",
  border: "1px solid #27272a",
  borderRadius: 8,
  fontSize: 12,
};

export default function OverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ts] = await Promise.all([
        getPlatformStats(),
        getPlatformTimeseries(range),
      ]);
      setStats(s);
      setTimeseries(ts);
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !stats)
    return (
      <div className="p-6">
        <LoadingState />
      </div>
    );

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="Platform Overview"
        description="Aggregated metrics across all tenants"
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        }
      />

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <StatCard
            label="Total Users"
            value={formatNumber(stats.total_users)}
            sub={`${stats.active_users} active`}
          />
          <StatCard
            label="Total Projects"
            value={formatNumber(stats.total_projects)}
            sub={`${stats.active_projects} active`}
          />
          <StatCard
            label="Total Events"
            value={formatNumber(stats.total_events)}
          />
          <StatCard
            label="Total Tokens"
            value={formatNumber(stats.total_tokens)}
          />
          <StatCard label="Cost Tracked" value={formatCost(stats.total_cost)} />
          <StatCard
            label="Active SDKs"
            value={formatNumber(stats.active_sdk_installations)}
            sub="Last 7 days"
          />
        </div>
      )}

      {/* Range selector */}
      <div className="flex items-center gap-1 mb-5">
        {["7d", "30d", "90d"].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              range === r
                ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                : "text-zinc-500 border-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Charts */}
      {timeseries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Events / Day">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="events"
                  stroke="#3b82f6"
                  fill="#3b82f615"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Cost Growth">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number | undefined) => [
                    `$${(v ?? 0).toFixed(4)}`,
                    "Cost",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#22c55e"
                  fill="#22c55e15"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          <SectionCard title="Token Volume" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timeseries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number | undefined) => [
                    formatNumber(v ?? 0),
                    "Tokens",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="#f59e0b"
                  fill="#f59e0b15"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
