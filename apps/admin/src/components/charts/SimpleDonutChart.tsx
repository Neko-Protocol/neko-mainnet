"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type Row = { label: string; value: number };

const PALETTE = [
  "var(--color-neko-blue)",
  "var(--color-neko-accent)",
  "var(--color-neko-muted)",
  "var(--color-neko-border)",
  "var(--color-neko-navy-hover)",
  "var(--color-neko-cream)",
];

const tooltipStyles = {
  backgroundColor: "var(--admin-elevated)",
  border: "1px solid var(--admin-border)",
  borderRadius: 8,
};

export function SimpleDonutChart({
  data,
  height = 200,
}: {
  data: Row[];
  height?: number;
}) {
  const chartData = data.map((d) => ({
    name: d.label === "default" ? "No preference" : d.label,
    value: d.value,
  }));
  const total = chartData.reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="flex w-full gap-4" style={{ minHeight: height }}>
      <div className="relative flex-1 min-w-0" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              contentStyle={tooltipStyles}
              formatter={(v: number) => [v, "Users"]}
            />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{
                paddingLeft: 12,
                color: "var(--admin-muted)",
                fontSize: 12,
              }}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="40%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={450}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`c-${PALETTE[index % PALETTE.length]}-${index}`}
                  fill={PALETTE[index % PALETTE.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-label text-[10px] font-semibold uppercase tracking-widest text-admin-subtle">
            Total
          </p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
      </div>
    </div>
  );
}
