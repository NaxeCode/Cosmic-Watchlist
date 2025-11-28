export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { items, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
            <Card key={item.id} className="flex flex-col gap-2 rounded-xl border border-border/70 bg-secondary/40 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="glow" className="capitalize text-[10px] sm:text-xs">
                  {item.type}
                </Badge>
                <span className="text-sm font-semibold sm:text-base">{item.title}</span>
                {item.rating !== null && item.rating !== undefined && (
                  <Badge variant="outline" className="text-[10px]">
                    {item.rating}/10
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] capitalize">
                  {item.status}
                </Badge>
              </div>
              {item.notes ? (
                <p className="text-xs text-muted-foreground">{item.notes}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No notes.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
