import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import React from "react";


type StatCardProps = {
  title: string;
  value: string | number;
  percentChange?: number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  valueClassName?: string;
};

export function StatCard({
  title,
  value,
  percentChange,
  icon: Icon,
  iconColor,
  iconBgColor,
  valueClassName,
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="p-5">
        <div className="flex items-center">
          <div
            className={cn(
              "flex-shrink-0 rounded-md p-3",
              iconBgColor
            )}
          >
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-400 truncate">{title}</dt>
              <dd className="flex items-baseline">
                <div className={cn("text-2xl font-semibold text-white", valueClassName)}>
                  {value}
                </div>
                {percentChange && (
                  <div className="ml-2 flex items-baseline text-sm font-semibold text-secondary">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                    <span className="sr-only">Increased by</span>
                    {percentChange}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
