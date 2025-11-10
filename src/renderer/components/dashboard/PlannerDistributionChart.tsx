import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PlannerStat } from '../../types/Dashboard';

interface PlannerDistributionChartProps {
  data: PlannerStat[];
  onPlannerClick?: (planner: string) => void;
  loading?: boolean;
}

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#f97316',
  '#ef4444',
];

const PlannerDistributionChartComponent: React.FC<PlannerDistributionChartProps> = ({
  data,
  onPlannerClick,
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
        <h3 className="text-lg font-bold text-neutral mb-4">Restordrer per innkjøper</h3>
        <p className="text-neutral-secondary">Ingen data tilgjengelig</p>
      </div>
    );
  }

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: PlannerStat;
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-neutral">{data.planner}</p>
          <p className="text-sm text-neutral-secondary">Antall ordre: {data.orderCount}</p>
          <p className="text-sm text-neutral-secondary">
            Restantall: {data.outstandingQty.toLocaleString('nb-NO')}
          </p>
          <p className="text-sm text-neutral-secondary">
            Prosentandel: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
      <h3 className="text-lg font-bold text-neutral mb-4">Restordrer per innkjøper</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ percentage }) => `${percentage.toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="orderCount"
            onClick={(data: PlannerStat) => {
              if (onPlannerClick) {
                onPlannerClick(data.planner);
              }
            }}
            style={{ cursor: onPlannerClick ? 'pointer' : 'default' }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value, entry: any) =>
              entry?.payload && typeof entry.payload === 'object' && 'planner' in entry.payload
                ? `${entry.payload.planner}: ${entry.payload.orderCount} ordre`
                : value
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

PlannerDistributionChartComponent.displayName = 'PlannerDistributionChart';

export const PlannerDistributionChart = React.memo(PlannerDistributionChartComponent);
