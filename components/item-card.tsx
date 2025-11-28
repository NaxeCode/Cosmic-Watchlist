"use client";

import { motion } from "framer-motion";
import { CalendarClock, Star, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditItemDialog } from "@/components/edit-item-dialog";
import { DeleteButton } from "@/components/delete-button";
import { tagsToArray } from "@/lib/utils";
import type { items } from "@/db/schema";

type Item = typeof items.$inferSelect;

const statusColors: Record<string, string> = {
  planned: "from-slate-700/70 to-slate-900/70",
  watching: "from-indigo-600/70 to-purple-700/70",
  paused: "from-amber-600/70 to-amber-800/70",
  completed: "from-emerald-600/70 to-emerald-800/70",
  dropped: "from-rose-600/70 to-rose-800/70",
};

export function ItemCard({ item, index }: { item: Item; index: number }) {
  const tags = tagsToArray(item.tags);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18 }}
    >
      <Card className="relative overflow-hidden border-border/70">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.25), transparent 35%), radial-gradient(circle at 80% 0%, rgba(45,212,191,0.22), transparent 30%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 opacity-10" />
        <CardHeader className="relative flex flex-row items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Badge variant="glow" className="capitalize">
                {item.type}
              </Badge>
              <span className="line-clamp-1">{item.title}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium shadow-inner">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: "var(--ring)",
                  }}
                />
                {item.status}
              </span>
              <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium shadow-inner">
                <CalendarClock className="h-3.5 w-3.5" />
                {new Intl.DateTimeFormat("en", {
                  month: "short",
                  day: "numeric",
                }).format(new Date(item.createdAt))}
              </span>
              {item.rating !== null && item.rating !== undefined && (
                <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium shadow-inner">
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  {item.rating}/10
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EditItemDialog item={item} />
            <DeleteButton id={item.id} />
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {item.notes ? (
            <p className="text-sm leading-relaxed text-foreground/90">
              {item.notes}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <Badge key={tag} variant="outline" className="capitalize">
                  <TagIcon className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">tag me later</Badge>
            )}
          </div>
        </CardContent>
        <div
          className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${statusColors[item.status] ?? "from-slate-700 to-slate-900"}`}
        />
      </Card>
    </motion.div>
  );
}
