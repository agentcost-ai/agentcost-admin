"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getDemoStats,
  getDemoTimeseries,
  type DemoStats,
  type DemoTimeseriesPoint,
} from "@/lib/api";
import { formatNumber } from "@/lib/utils";
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

export default function DemoAnalyticsPage() {
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [timeseries, setTimeseries] = useState<DemoTimeseriesPoint[]>([]);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ts] = await Promise.all([
        getDemoStats(),
        getDemoTimeseries(range),
      ]);
      setStats(s);
      setTimeseries(ts);
    } catch (err) {
      console.error("Failed to load demo analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !stats)
    return (
      <div className="p-4 sm:p-6">
        <LoadingState />
      </div>
    );

  return (
    <div className="p-4 sm:p-6 max-w-350">
      <PageHeader
        title="Demo Funnel"
        description="No-signup demo usage and demo → signup conversion"
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
            label="Demo Sessions"
            value={formatNumber(stats.total_sessions)}
            sub={`${stats.sessions_24h} in last 24h`}
          />
          <StatCard
            label="Last 7 Days"
            value={formatNumber(stats.sessions_7d)}
            sub={`${formatNumber(stats.sessions_30d)} in 30d`}
          />
          <StatCard
            label="Avg Pages / Session"
            value={stats.avg_page_views.toFixed(1)}
          />
          <StatCard
            label="Signup Clicks"
            value={formatNumber(stats.signup_clicks)}
            sub={`${stats.click_through_rate}% of sessions`}
          />
          <StatCard
            label="Conversions"
            value={formatNumber(stats.conversions)}
            sub="Demo → account"
          />
          <StatCard
            label="Conversion Rate"
            value={`${stats.conversion_rate}%`}
          />
        </div>
      )}

      {/* Range selector */}
      <div className="flex items-center gap-1 mb-5">
        {["7d", "30d", "90d"].map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 min-h-10 sm:min-h-0 text-xs rounded-lg border transition-colors ${
              range === r
                ? "bg-blue-500/10 text-blue-400 border-blue-500/25"
                : "text-zinc-500 border-zinc-800/60 hover:text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sessions + conversions chart */}
        <SectionCard title="Demo Sessions / Day" className="lg:col-span-2 min-w-0">
          {timeseries.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
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
                  dataKey="sessions"
                  stroke="#38bdf8"
                  fill="#38bdf815"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  stroke="#22c55e"
                  fill="#22c55e15"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-600 py-10 text-center">
              No demo sessions in this range yet.
            </p>
          )}
        </SectionCard>

        {/* Entry sources */}
        <SectionCard title="Entry Sources (30d)" className="min-w-0">
          {stats && stats.top_sources.length > 0 ? (
            <div className="space-y-2">
              {stats.top_sources.map((s) => (
                <div
                  key={s.source}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="text-zinc-300 font-mono truncate">
                    {s.source}
                  </span>
                  <span className="text-zinc-500 shrink-0">
                    {formatNumber(s.sessions)} sessions
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 py-6 text-center">
              No data yet.
            </p>
          )}
        </SectionCard>

        {/* Most explored pages */}
        <SectionCard title="Most Explored Pages (30d)" className="min-w-0">
          {stats && stats.top_pages.length > 0 ? (
            <div className="space-y-2">
              {stats.top_pages.map((p) => (
                <div
                  key={p.page}
                  className="flex items-center justify-between gap-3 text-[13px]"
                >
                  <span className="text-zinc-300 font-mono truncate">
                    {p.page}
                  </span>
                  <span className="text-zinc-500 shrink-0">
                    {formatNumber(p.views)} sessions
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 py-6 text-center">
              No data yet.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
