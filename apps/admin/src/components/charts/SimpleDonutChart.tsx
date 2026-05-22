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
  "#229EDF",
  "#4ADE80",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#FB7185",
];

const tooltipStyles = {
  backgroundColor: "#242424",
  border: "1px solid rgba(255,255,255,.08)",
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
                color: "rgba(255,255,255,0.65)",
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            TOTAL
          </p>
          <p className="text-2xl font-bold text-white">{total}</p>
        </div>
      </div>
    </div>
  );
}
