"use client";

import { useState } from "react";
import { ItemCard } from "@/components/item-card";
import { PaginationControls } from "@/components/pagination-controls";
import { CommandPalette } from "@/components/command-palette";
import { AiCategorizeButtons } from "@/components/ai-categorize-button";
import { useCallback } from "react";
type Item = any;
type Minimal = {
  id: number;
  title: string;
  status: string;
  type: string;
  tags?: string | null;
  [key: string]: any;
};

export function ItemsView({
  items,
  allItems,
  page,
  totalPages,
  total,
  params,
  pageSize,
  aiAvailable,
}: {
  items: Item[];
  allItems: Minimal[];
  page: number;
  totalPages: number;
  total: number;
  params: Record<string, string | string[] | undefined>;
  pageSize: number;
  aiAvailable: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <PaginationControls page={page} totalPages={totalPages} params={params} pageSize={pageSize} />
        <div className="flex flex-wrap items-center gap-2">
          <AiCategorizeButtons disabled={!aiAvailable} selectedIds={selectedIds} />
          <CommandPalette
            withTrigger
            items={allItems}
            selected={selectedIds}
            onSelectedChange={setSelectedIds}
          />
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((item, idx) => (
          <ItemCard
            key={item.id}
            item={item}
            index={idx}
            selected={selectedIds.includes(item.id)}
            onToggle={toggleSelect}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Page {page} of {totalPages} | {total} item{total === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}
