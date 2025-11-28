export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { items, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { Clock, Star } from "lucide-react";

export default async function SharePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.publicHandle, handle),
    columns: { id: true, name: true, publicEnabled: true },
  });

  if (!user || !user.publicEnabled) {
    return notFound();
  }

  const entries = await db.query.items.findMany({
    where: eq(items.userId, user.id),
    orderBy: [desc(items.createdAt)],
  });

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <Badge variant="glow" className="text-xs uppercase tracking-[0.2em]">
          Shared Watchlist
        </Badge>
        <h1 className="text-3xl font-semibold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">
          {user.name ? `${user.name}'s list` : "A shared watchlist"}
        </p>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-secondary/40 p-6 text-center text-muted-foreground">
          No items yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-border/70 bg-secondary/40 p-3"
            >
              <div className="flex gap-3">
                <div className="relative h-24 w-16 overflow-hidden rounded-lg border border-border/60 bg-black/30">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
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
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {item.status}
                    </Badge>
                    {item.rating !== null && item.rating !== undefined && (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-medium">
                        <Star className="h-3 w-3 text-amber-400" />
                        {item.rating}/10
                      </span>
                    )}
                  </div>
                  {(item.runtimeMinutes || item.studios) && (
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {item.runtimeMinutes ? `${item.runtimeMinutes}m` : null}
                        {item.runtimeMinutes && item.studios ? " • " : null}
                        {item.studios ?? ""}
                      </span>
                    </div>
                  )}
                  {item.synopsis && (
                    <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {item.synopsis}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {item.notes?.trim() ? item.notes : "No notes."}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
