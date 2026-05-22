"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Row = { label: string; value: number };

const tooltipStyles = {
  backgroundColor: "#242424",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 8,
};

export function SimpleBarChart({
  data,
  color = "#229EDF",
  height = 250,
}: {
  data: Row[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
      >
        <XAxis type="number" hide axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyles}
          labelStyle={{ color: "rgba(255,255,255,0.75)" }}
          formatter={(value: number) => [value, "count"]}
        />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
