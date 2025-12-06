"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { memo, useCallback, useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ChevronDown, ChevronUp, Clock, Star, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteButton } from "@/components/delete-button";
import { tagsToArray } from "@/lib/utils";
type Item = any;

const createdFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

export const ItemCard = memo(function ItemCard({
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
  const [showNotes, setShowNotes] = useState(false);

  const { tags, genres, studios, cast } = useMemo(
    () => ({
      tags: tagsToArray(item.tags),
      genres: tagsToArray(item.genres),
      studios: tagsToArray(item.studios),
      cast: tagsToArray(item.cast),
    }),
    [item.cast, item.genres, item.studios, item.tags],
  );

  const metaLine = useMemo(
    () =>
      [
        item.releaseYear ? String(item.releaseYear) : null,
        item.runtimeMinutes ? formatRuntime(item.runtimeMinutes) : null,
        studios[0],
      ]
        .filter(Boolean)
        .join(" | "),
    [item.releaseYear, item.runtimeMinutes, studios],
  );

  const createdLabel = useMemo(
    () => createdFormatter.format(new Date(item.createdAt)),
    [item.createdAt],
  );

  const onTagClick = useCallback(
    (tag: string) => {
      const formatted = capitalize(tag);
      const next = new URLSearchParams(searchParams.toString());
      next.set("tag", formatted);
      next.set("page", "1");
      startTransition(() => {
        router.push(`/?${next.toString()}`, { scroll: false });
      });
    },
    [router, searchParams, startTransition],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.14 }}
    >
      <Card className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border/70 bg-secondary/40 p-3 shadow-sm sm:flex-row">
        <div className="surface-strong relative h-40 w-full overflow-hidden rounded-xl border border-border/70 shadow-inner sm:h-32 sm:w-24">
          {item.posterUrl ? (
            <Image src={item.posterUrl} alt={item.title} fill sizes="160px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">
              No poster
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <Badge variant="glow" className="capitalize text-[10px] sm:text-xs">
              {item.type}
            </Badge>
            <span className="text-sm font-semibold sm:text-base">{item.title}</span>
            {item.releaseYear && (
              <Badge variant="outline" className="text-[10px]">
                {item.releaseYear}
              </Badge>
            )}
            <Badge variant="outline" className="capitalize text-[10px]">
              {item.status}
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              {item.rating !== null && item.rating !== undefined && (
                <span className="surface-muted inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1 text-[11px] font-medium">
                  <Star className="h-3 w-3 text-amber-400" />
                  {item.rating}/10
                </span>
              )}
              <label className="surface-muted flex items-center gap-1.5 rounded-full px-2 py-1 shadow-inner">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border border-border/70 bg-transparent accent-primary"
                  checked={selected}
                  onChange={() => onToggle(item.id)}
                  aria-label="Select item"
                />
              </label>
              <EditItemDialog item={item} />
              <DeleteButton id={item.id} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <CalendarClock className="h-3 w-3" />
            <span>{createdLabel}</span>
            {metaLine && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <Clock className="h-3.5 w-3.5" />
                <span>{metaLine}</span>
              </>
            )}
          </div>

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
                  className="surface-muted inline-flex items-center rounded-full border border-border/70 px-2 py-1 text-[10px] capitalize transition hover:border-primary/60 hover:text-foreground"
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
              <div className="surface-inset rounded-lg border border-border/60 p-2 text-xs leading-relaxed text-foreground/90">
                {item.notes?.trim() ? item.notes : "No notes yet."}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
});

function capitalize(text: string) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${minutes}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
