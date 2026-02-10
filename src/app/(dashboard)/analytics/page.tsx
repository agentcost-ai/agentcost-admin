"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getTopModels,
  getTopSpenders,
  getProviderGrowth,
  getCostPerUser,
  type TopModel,
  type TopSpender,
  type ProviderGrowthPoint,
  type CostPerUser,
} from "@/lib/api";
import { formatNumber, formatCost } from "@/lib/utils";
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const RANGE_OPTIONS = [
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
];

const PROVIDER_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [topModels, setTopModels] = useState<TopModel[]>([]);
  const [topSpenders, setTopSpenders] = useState<TopSpender[]>([]);
  const [providerGrowth, setProviderGrowth] = useState<ProviderGrowthPoint[]>(
    [],
  );
  const [costPerUser, setCostPerUser] = useState<CostPerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [models, spenders, growth, cpu] = await Promise.all([
        getTopModels(range, 20),
        getTopSpenders(range, 20),
        getProviderGrowth(range),
        getCostPerUser(range),
      ]);
      setTopModels(models);
      setTopSpenders(spenders);
      setProviderGrowth(growth);
      setCostPerUser(cpu);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reshape provider growth data for stacked area chart
  const providerNames = Array.from(
    new Set(providerGrowth.map((d) => d.provider)),
  );
  const growthByDate = providerGrowth.reduce<
    Record<string, Record<string, unknown>>
  >((acc, item) => {
    if (!acc[item.date]) acc[item.date] = { date: item.date };
    acc[item.date][item.provider] = item.calls;
    return acc;
  }, {});
  const growthChartData = Object.values(growthByDate).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string),
  );

  if (loading) return <LoadingState />;

  return (
    <div className="p-6 max-w-350">
      <PageHeader
        title="Platform Analytics"
        description="Cross-tenant usage patterns and cost distribution"
        actions={
          <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 text-xs transition-colors ${
                  range === opt.value
                    ? "bg-blue-500/15 text-blue-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Cost per user summary */}
      {costPerUser && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <StatCard
            label="Total Platform Cost"
            value={formatCost(costPerUser.total_cost)}
          />
          <StatCard
            label="Active Users"
            value={formatNumber(costPerUser.unique_users)}
          />
          <StatCard
            label="Avg Cost / User"
            value={formatCost(costPerUser.avg_cost_per_user)}
          />
        </div>
      )}

      {/* Provider growth chart */}
      {growthChartData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Provider Usage Over Time
          </h3>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={growthChartData}>
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
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                />
                {providerNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stackId="1"
                    stroke={PROVIDER_COLORS[i % PROVIDER_COLORS.length]}
                    fill={PROVIDER_COLORS[i % PROVIDER_COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top models & top spenders side by side */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Top Models by Usage
          </h3>
          <DataTable>
            <Thead>
              <tr>
                <Th>#</Th>
                <Th>Model</Th>
                <Th className="text-right">Calls</Th>
                <Th className="text-right">Tokens</Th>
                <Th className="text-right">Cost</Th>
                <Th className="text-right">Projects</Th>
              </tr>
            </Thead>
            <tbody>
              {topModels.map((m, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <Td className="text-zinc-500 text-xs">{i + 1}</Td>
                  <Td>
                    <span className="font-mono text-xs text-zinc-200">
                      {m.model}
                    </span>
                  </Td>
                  <Td className="text-right font-mono text-xs">
                    {formatNumber(m.calls)}
                  </Td>
                  <Td className="text-right font-mono text-xs">
                    {formatNumber(m.tokens)}
                  </Td>
                  <Td className="text-right font-mono text-xs text-emerald-400">
                    {formatCost(m.cost)}
                  </Td>
                  <Td className="text-right font-mono text-xs text-zinc-400">
                    {m.project_count}
                  </Td>
                </tr>
              ))}
              {topModels.length === 0 && (
                <tr>
                  <Td colSpan={6} className="text-center text-zinc-500">
                    No data for this period
                  </Td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Top Spenders
          </h3>
          <DataTable>
            <Thead>
              <tr>
                <Th>#</Th>
                <Th>Project</Th>
                <Th>Owner</Th>
                <Th className="text-right">Calls</Th>
                <Th className="text-right">Cost</Th>
              </tr>
            </Thead>
            <tbody>
              {topSpenders.map((s, i) => (
                <tr key={i} className="hover:bg-zinc-800/30">
                  <Td className="text-zinc-500 text-xs">{i + 1}</Td>
                  <Td>
                    <span className="text-xs text-zinc-200">
                      {s.project_name}
                    </span>
                  </Td>
                  <Td className="text-xs text-zinc-400">{s.owner_email}</Td>
                  <Td className="text-right font-mono text-xs">
                    {formatNumber(s.calls)}
                  </Td>
                  <Td className="text-right font-mono text-xs text-emerald-400">
                    {formatCost(s.cost)}
                  </Td>
                </tr>
              ))}
              {topSpenders.length === 0 && (
                <tr>
                  <Td colSpan={5} className="text-center text-zinc-500">
                    No data for this period
                  </Td>
                </tr>
              )}
            </tbody>
          </DataTable>
        </div>
      </div>
    </div>
  );
}
