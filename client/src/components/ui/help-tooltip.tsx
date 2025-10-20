import { ReactNode } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { HelpCircle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

import {Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HelpTooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  variant?: "default" | "info" | "warning" | "success";
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export function HelpTooltip({
  content,
  children,
  side = "top",
  variant = "default",
  size = "sm",
  showIcon = true,
  iconOnly = false,
  className,
}: HelpTooltipProps) {
  const getIcon = () => {
    const iconSize = size === "sm" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-5 w-5";
    
    switch (variant) {
      case "info":
        return <Info className={cn(iconSize, "text-blue-500")} />;
      case "warning":
        return <AlertCircle className={cn(iconSize, "text-orange-500")} />;
      case "success":
        return <CheckCircle className={cn(iconSize, "text-green-500")} />;
      default:
        return <HelpCircle className={cn(iconSize, "text-muted-foreground")} />;
    }
  };

  const trigger = iconOnly ? (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-auto p-1 text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {getIcon()}
    </Button>
  ) : (
    <div className={cn("flex items-center gap-1", className)}>
      {children}
      {showIcon && getIcon()}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {trigger}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        <div className="text-sm">
          {content}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Specific help tooltips for common use cases
export const FieldHelpTooltip = ({ content, ...props }: Omit<HelpTooltipProps, "iconOnly">) => (
  <HelpTooltip content={content} iconOnly variant="info" size="sm" {...props} />
);

export const ActionHelpTooltip = ({ content, children, ...props }: HelpTooltipProps) => (
  <HelpTooltip content={content} showIcon={false} {...props}>
    {children}
  </HelpTooltip>
);

export const StatusHelpTooltip = ({ 
  content, 
  status,
  ...props 
}: Omit<HelpTooltipProps, "variant"> & { status: "info" | "warning" | "success" | "error" }) => {
  const variant = status === "error" ? "warning" : status;
  return <HelpTooltip content={content} iconOnly variant={variant} size="sm" {...props} />;
};
