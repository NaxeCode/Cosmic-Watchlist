"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ChevronDown, ChevronUp, Star, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteButton } from "@/components/delete-button";
import { tagsToArray } from "@/lib/utils";
import type { items } from "@/db/schema";

type Item = typeof items.$inferSelect;

export function ItemCard({ item, index }: { item: Item; index: number }) {
  const tags = tagsToArray(item.tags);
  const [showNotes, setShowNotes] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.14 }}
    >
      <Card className="relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-primary"
            aria-label="Select item"
          />
          <Badge variant="glow" className="capitalize text-[10px] sm:text-xs">
            {item.type}
          </Badge>
          <span className="line-clamp-1 text-sm font-semibold sm:text-base">{item.title}</span>
          {tags.length > 0 ? (
            tags.map((tag) => (
              <Badge key={tag} variant="outline" className="capitalize text-[10px]">
                <TagIcon className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="text-[10px]">
              tag me later
            </Badge>
          )}
          {item.rating !== null && item.rating !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium">
              <Star className="h-3 w-3 text-amber-400" />
              {item.rating}/10
            </span>
          )}
          <span className="ml-auto flex items-center gap-2 rounded-full bg-white/5 px-2 py-1 text-[11px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
              new Date(item.createdAt),
            )}
          </span>
          <div className="flex items-center gap-1">
            <EditItemDialog item={item} />
            <DeleteButton id={item.id} />
          </div>
        </div>
        <CardContent className="mt-2 space-y-2 p-0">
          <button
            type="button"
            onClick={() => setShowNotes((p) => !p)}
            className="flex items-center gap-1 text-xs font-medium text-primary transition hover:text-primary/80"
          >
            {showNotes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showNotes ? "Hide notes" : "Show notes"}
          </button>
          {showNotes && (
            <div className="rounded-lg border border-border/60 bg-black/30 p-2 text-xs leading-relaxed text-foreground/90">
              {item.notes?.trim() ? item.notes : "No notes yet."}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
