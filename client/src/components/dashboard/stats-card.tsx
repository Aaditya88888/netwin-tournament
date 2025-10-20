import { Card, CardContent } from "@/components/ui/card";
import React from "react";
import { formatCurrency } from "@/lib/utils";

import {TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Trophy,
  Users,
  DollarSign,
  Shield
} from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: "trophy" | "users" | "currency" | "verification";
  change?: number;
  trend?: "up" | "down" | "warning" | "neutral";
  isCurrency?: boolean;
}

const StatsCard = ({ 
  title, 
  value, 
  icon, 
  change = 0, 
  trend = "neutral",
  isCurrency = false
}: StatsCardProps) => {
  
  // Render the icon based on the prop
  const renderIcon = () => {
    switch (icon) {
      case "trophy":
        return <Trophy className="h-6 w-6" />;
      case "users":
        return <Users className="h-6 w-6" />;
      case "currency":
        return <DollarSign className="h-6 w-6" />;
      case "verification":
        return <Shield className="h-6 w-6" />;
      default:
        return <Trophy className="h-6 w-6" />;
    }
  };
  
  // Determine trend icon and styles
  const renderTrendIndicator = () => {
    if (trend === "up") {
      return (
        <div className="flex items-center text-green-500">
          <TrendingUp className="h-4 w-4 mr-1" />
          <p className="text-xs">+{change.toFixed(1)}% from last week</p>
        </div>
      );
    } else if (trend === "down") {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className="h-4 w-4 mr-1" />
          <p className="text-xs">-{Math.abs(change).toFixed(1)}% from last week</p>
        </div>
      );
    } else if (trend === "warning") {
      return (
        <div className="flex items-center text-yellow-500">
          <AlertCircle className="h-4 w-4 mr-1" />
          <p className="text-xs">Needs attention</p>
        </div>
      );
    }
    return null;
  };
  
  // Icon background color based on icon type
  const getIconBgColor = () => {
    switch (icon) {
      case "trophy":
        return "bg-primary/10 text-primary";
      case "users":
        return "bg-secondary/10 text-secondary";
      case "currency":
        return "bg-accent/10 text-accent";
      case "verification":
        return "bg-yellow-500/10 text-yellow-500";
      default:
        return "bg-primary/10 text-primary";
    }
  };
  
  // Format value if it's a number or currency
  const formattedValue = () => {
    if (typeof value === "number") {
      return isCurrency ? formatCurrency(value) : value.toLocaleString();
    }
    return value;
  };

  return (
    <Card className="game-card shadow-md">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-game font-bold text-foreground">{formattedValue()}</p>
          </div>
          <div className={`p-3 rounded-md ${getIconBgColor()}`}>
            {renderIcon()}
          </div>
        </div>
        <div className="mt-4">
          {renderTrendIndicator()}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
