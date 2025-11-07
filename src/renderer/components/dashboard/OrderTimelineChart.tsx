import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { WeekStat } from "../../types/Dashboard";

interface OrderTimelineChartProps {
  data: WeekStat[];
  loading?: boolean;
}

const OrderTimelineChartComponent: React.FC<OrderTimelineChartProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6">
        <h3 className="text-lg font-bold text-neutral mb-4">Ordre tidslinje</h3>
        <p className="text-neutral-secondary">Ingen data tilgjengelig</p>
      </div>
    );
  }

  const currentWeekIndex = data.findIndex((week) => week.isCurrentWeek);
  const currentWeek =
    currentWeekIndex >= 0 ? data[currentWeekIndex] : undefined;

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: WeekStat;
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-neutral">{data.weekLabel}</p>
          <p className="text-sm text-neutral-secondary">{data.dateRange}</p>
          <p className="text-sm text-blue-600">
            Totale ordre: {data.orderCount}
          </p>
          <p className="text-sm text-red-600">
            Forfalte ordre: {data.overdueCount}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
      <h3 className="text-lg font-bold text-neutral mb-4">
        Ordre tidslinje (per uke)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {currentWeek && (
            <ReferenceLine
              x={currentWeek.weekLabel}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label="Nåværende uke"
            />
          )}
          <Line
            type="monotone"
            dataKey="orderCount"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Totale ordre"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="overdueCount"
            stroke="#ef4444"
            strokeWidth={2}
            name="Forfalte ordre"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

OrderTimelineChartComponent.displayName = "OrderTimelineChart";

export const OrderTimelineChart = React.memo(OrderTimelineChartComponent);
