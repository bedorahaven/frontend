"use client";

import type { ReactNode } from "react";
import { ListFilter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  children?: ReactNode;
  className?: string;
}

interface DataFilterSelectProps {
  value: string;
  onValueChange: (value: string | null) => void;
  ariaLabel: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

export function DataFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchLabel,
  children,
  className = "",
}: DataFilterBarProps) {
  return (
    <div className={`grid grid-cols-1 gap-2 ${className}`}>
      <div className="group relative min-w-0">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-accent"
          aria-hidden="true"
        />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
          className="h-11 rounded-xl border-border/80 bg-background pl-10 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/80 hover:border-border focus-visible:border-accent focus-visible:ring-accent/20"
        />
      </div>
      {children}
    </div>
  );
}

export function DataFilterSelect({
  value,
  onValueChange,
  ariaLabel,
  placeholder,
  options,
}: DataFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-11 w-full rounded-xl border-border/80 bg-background px-3 text-sm shadow-sm transition-colors hover:border-border focus-visible:border-accent focus-visible:ring-accent/20"
      >
        <ListFilter
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
