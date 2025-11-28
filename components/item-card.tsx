"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ChevronDown, ChevronUp, Clock, Star, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteButton } from "@/components/delete-button";
import { tagsToArray } from "@/lib/utils";
type Item = any;

export function ItemCard({
  item,
  index,
  selected,
  onToggle,
}: {
  item: Item;
  index: number;
  selected: boolean;
  onToggle: (id: number) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const tags = tagsToArray(item.tags);
  const genres = tagsToArray(item.genres);
  const studios = tagsToArray(item.studios);
  const cast = tagsToArray(item.cast);
  const [showNotes, setShowNotes] = useState(false);

  const metaLine = [
    item.releaseYear ? String(item.releaseYear) : null,
    item.runtimeMinutes ? `${item.runtimeMinutes}m` : null,
    studios[0],
  ]
    .filter(Boolean)
    .join(" • ");

  const createdLabel = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(item.createdAt));

  const onTagClick = (tag: string) => {
    const formatted = capitalize(tag);
    const next = new URLSearchParams(searchParams.toString());
    next.set("tag", formatted);
    next.set("page", "1");
    startTransition(() => {
      router.push(`/?${next.toString()}`, { scroll: false });
    });
  };

  function capitalize(text: string) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.14 }}
    >
      <Card className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-secondary/40 p-3 shadow-sm md:flex-row">
        <div className="flex flex-col items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full bg-black/30 px-2 py-1 shadow-inner">
            <input
              type="checkbox"
              className="h-4 w-4 cursor-pointer rounded border border-border/70 bg-transparent accent-primary"
              checked={selected}
              onChange={() => onToggle(item.id)}
              aria-label="Select item"
            />
          </label>
          <Badge variant="outline" className="capitalize text-[10px]">
            {item.status}
          </Badge>
          {item.rating !== null && item.rating !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium">
              <Star className="h-3 w-3 text-amber-400" />
              {item.rating}/10
            </span>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            {createdLabel}
          </div>
        </div>

        <div className="relative h-32 w-24 overflow-hidden rounded-xl border border-border/70 bg-black/40 shadow-inner">
          {item.posterUrl ? (
            <Image src={item.posterUrl} alt={item.title} fill sizes="120px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="glow" className="capitalize text-[10px] sm:text-xs">
              {item.type}
            </Badge>
            <span className="text-sm font-semibold sm:text-base">{item.title}</span>
            {item.releaseYear && (
              <Badge variant="outline" className="text-[10px]">
                {item.releaseYear}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-1">
              <EditItemDialog item={item} />
              <DeleteButton id={item.id} />
            </div>
          </div>

          {metaLine && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{metaLine}</span>
            </div>
          )}

          {item.synopsis && (
            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {item.synopsis}
            </p>
          )}

          {cast.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Cast: <span className="text-foreground/80">{cast.slice(0, 4).join(", ")}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
          {genres.concat(tags).length > 0 ? (
            Array.from(new Set([...genres, ...tags])).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                className="inline-flex items-center rounded-full border border-border/70 bg-black/30 px-2 py-1 text-[10px] capitalize transition hover:border-primary/60 hover:text-foreground"
              >
                <TagIcon className="mr-1 h-3 w-3" />
                {tag}
              </button>
            ))
          ) : (
            <Badge variant="outline" className="text-[10px]">
              tag me later
            </Badge>
          )}
          </div>

          <CardContent className="space-y-2 p-0">
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
        </div>
      </Card>
    </motion.div>
  );
}
