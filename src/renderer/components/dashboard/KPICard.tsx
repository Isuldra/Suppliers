import React from "react";
import { format } from "date-fns";

interface KPICardProps {
  title: string;
  value: number | string | Date | null;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: "up" | "down";
  };
  onClick?: () => void;
  loading?: boolean;
  formatType?: "number" | "currency" | "date" | "percentage";
  suffix?: string; // Optional suffix to append after the value
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  onClick,
  loading = false,
  formatType = "number",
  suffix,
}) => {
  const formatValue = (val: number | string | Date | null): string => {
    if (loading) return "---";
    if (val === null) return "N/A";

    if (formatType === "date" && val instanceof Date) {
      return format(val, "dd.MM.yyyy");
    }

    if (typeof val === "string") return val;

    if (formatType === "number") {
      return val.toLocaleString("nb-NO");
    }

    if (formatType === "currency") {
      return `${val.toLocaleString("nb-NO")} kr`;
    }

    if (formatType === "percentage") {
      if (typeof val === "number") {
        return `${val.toFixed(1)}%`;
      }
      return "N/A";
    }

    return String(val);
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white/60 backdrop-blur-2xl rounded-xl border border-white/50 shadow-xl p-6 transition-all duration-300 hover:bg-white/70 hover:shadow-2xl ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center">
        <div className="p-3 bg-blue-100 rounded-full">{icon}</div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-neutral-secondary">{title}</p>
          {loading ? (
            <div className="animate-pulse h-8 w-24 bg-gray-200 rounded mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-neutral">
              {formatValue(value)}
              {suffix && <span className="text-lg ml-1">{suffix}</span>}
            </p>
          )}
          {trend && !loading && (
            <div
              className={`flex items-center mt-1 text-sm ${
                trend.direction === "up" ? "text-green-600" : "text-red-600"
              }`}
            >
              <span>{trend.direction === "up" ? "↑" : "↓"}</span>
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
