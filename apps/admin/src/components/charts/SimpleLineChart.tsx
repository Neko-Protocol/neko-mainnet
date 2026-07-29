"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Point = { date: string; value: number };

const tooltipStyles = {
  backgroundColor: "var(--admin-elevated)",
  border: "1px solid var(--admin-border)",
  borderRadius: 8,
};

export function SimpleLineChart({
  data,
  color = "var(--color-neko-blue)",
  height = 200,
}: {
  data: Point[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((d) => ({
    ...d,
    short: d.date.slice(5),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="short"
          tick={{ fill: "var(--admin-subtle)", fontSize: 11 }}
          axisLine={{ stroke: "transparent" }}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={28}
        />
        <YAxis hide width={0} axisLine={{ stroke: "transparent" }} />
        <Tooltip
          contentStyle={tooltipStyles}
          labelStyle={{ color: "var(--admin-muted)" }}
          formatter={(value: number) => [value, "count"]}
          labelFormatter={(label: string | number | undefined, payload) => {
            const first = payload?.[0]?.payload as Point | undefined;
            const full = typeof first?.date === "string" ? first.date : label;
            return typeof full === "string" ? full : "";
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0, fill: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
