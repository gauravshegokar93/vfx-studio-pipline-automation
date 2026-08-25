"use client";

import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceCardProps {
  roleKey: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  disabled?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
}

export function WorkspaceCard({
  roleKey,
  title,
  description,
  icon,
  color,
  disabled = false,
  isSelected = false,
  onClick,
}: WorkspaceCardProps) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/20 scale-[1.02] bg-primary/5"
          : "border-border hover:shadow-md hover:border-primary/50",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      {/* Selected Check Icon */}
      {isSelected && (
        <div
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: color }}
        >
          <Check className="h-4 w-4 text-white" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {icon}
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <ArrowRight
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            !isSelected && !disabled && "group-hover:translate-x-1 group-hover:text-primary",
            isSelected && "text-primary"
          )}
        />
      </div>
    </div>
  );
}
