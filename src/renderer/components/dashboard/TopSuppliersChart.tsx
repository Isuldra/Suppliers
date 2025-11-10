import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SupplierStat } from '../../types/Dashboard';

interface TopSuppliersChartProps {
  data: SupplierStat[];
  onSupplierClick?: (supplier: string) => void;
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

const TopSuppliersChartComponent: React.FC<TopSuppliersChartProps> = ({
  data,
  onSupplierClick,
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
        <h3 className="text-lg font-bold text-neutral mb-4">
          Topp 5 leverandører - Antall restlinjer
        </h3>
        <p className="text-neutral-secondary">Ingen data tilgjengelig</p>
      </div>
    );
  }

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: SupplierStat;
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-bold text-neutral">{data.name}</p>
          <p className="text-sm text-neutral-secondary">
            Antall linjer:{' '}
            {data.outstandingLines?.toLocaleString('nb-NO') ||
              data.orderCount.toLocaleString('nb-NO')}
          </p>
          {data.averageDelayDays !== undefined && (
            <p className="text-sm text-neutral-secondary">
              Gjennomsnittlig forsinkelse: {data.averageDelayDays.toFixed(1)} dager
            </p>
          )}
          {data.onTimeDeliveryRate !== undefined && (
            <p className="text-sm text-neutral-secondary">
              On-time delivery: {data.onTimeDeliveryRate.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl">
      <h3 className="text-lg font-bold text-neutral mb-4">
        Topp 5 leverandører - Antall restlinjer
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(value) => value.toLocaleString('nb-NO')} tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="outstandingLines"
            onClick={(data: SupplierStat) => {
              if (onSupplierClick) {
                onSupplierClick(data.name);
              }
            }}
            style={{ cursor: onSupplierClick ? 'pointer' : 'default' }}
            aria-label="Leverandør stolpediagram"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

TopSuppliersChartComponent.displayName = 'TopSuppliersChart';

export const TopSuppliersChart = React.memo(TopSuppliersChartComponent);
