"use client";

import * as React from "react";
import { cn } from "../../utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "glow";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-shadow",
        variant === "default" && "bg-primary/80 text-primary-foreground shadow-glow",
        variant === "outline" &&
          "border border-border/70 text-muted-foreground hover:text-foreground",
        variant === "glow" &&
          "bg-gradient-to-r from-indigo-500/70 to-purple-600/70 text-white shadow-glow",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
