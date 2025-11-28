import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { tagsToArray } from "@/lib/utils";
import type { items } from "@/db/schema";

type Item = typeof items.$inferSelect;

export function SmartStats({ items }: { items: Item[] }) {
  if (!items.length) return null;

  const total = items.length;
  const completed = items.filter((item) => item.status === "completed");
  const completionRate = total ? Math.round((completed.length / total) * 100) : 0;
  const minutesWatched = completed.reduce(
    (sum, item) => sum + (item.runtimeMinutes ?? 0),
    0,
  );
  const timeByType = groupTimeByType(completed);
  const activity = buildActivitySeries(items);
  const heatmap = buildHeatmap(completed);
  const topGenres = topTokens(items, ["genres", "tags"], 5);
  const topStudios = topTokens(items, ["studios"], 5);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Card className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-secondary/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Time spent</p>
            <h3 className="text-xl font-semibold">Runtime logged</h3>
          </div>
          <Badge variant="outline">{formatDuration(minutesWatched)}</Badge>
        </div>
        <div className="space-y-2">
          {timeByType.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runtime data yet.</p>
          ) : (
            timeByType.map((row) => (
              <div key={row.type} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{row.type}</span>
                  <span>{Math.round(row.minutes)} min</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-secondary/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Completion</p>
            <h3 className="text-xl font-semibold">Rate & activity</h3>
          </div>
          <Badge variant="outline">{completed.length} done</Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-black/30">
            <div
              className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/80 to-primary shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
              style={{
                backgroundImage: `conic-gradient(var(--color-primary, #a78bfa) ${completionRate}%, rgba(255,255,255,0.06) ${completionRate}% 100%)`,
              }}
            >
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-secondary/80 text-sm font-semibold">
                {completionRate}%
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Completed</span>
              <span>
                {completed.length}/{total}
              </span>
            </div>
            <div className="flex gap-1">
              {activity.map((row) => (
                <div key={row.label} className="flex-1 space-y-1">
                  <div className="h-12 overflow-hidden rounded-md bg-black/30">
                    <div
                      className="h-full w-full bg-gradient-to-t from-primary/70 via-primary/40 to-transparent"
                      style={{ height: `${row.height}%` }}
                    />
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">{row.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Heatmap</p>
          <div
            className="grid grid-cols-12 gap-1 rounded-xl border border-border/60 bg-black/40 p-2"
            style={{ gridAutoRows: "12px" }}
          >
            {heatmap.cells.map((cell) => (
              <span
                key={cell.key}
                className="rounded-sm"
                title={`${cell.label}: ${cell.count} completed`}
                style={{
                  backgroundColor: heatColor(cell.count, heatmap.max),
                  opacity: cell.count === 0 ? 0.35 : 1,
                }}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Taste profile</p>
            <h3 className="text-xl font-semibold">Genres & studios</h3>
          </div>
          <Badge variant="glow">Auto-tagged</Badge>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Favorite genres</p>
            {topGenres.length === 0 ? (
              <p className="text-sm text-muted-foreground">Add tags to unlock genre stats.</p>
            ) : (
              <div className="space-y-2">
                {topGenres.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-black/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="capitalize">{row.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{row.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Studios / networks</p>
            {topStudios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Metadata will populate here once fetched.</p>
            ) : (
              <div className="space-y-2">
                {topStudios.map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-lg border border-border/60 bg-black/30 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="capitalize">{row.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{row.count}x</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  );
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "0h";
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const leftoverHours = hours % 24;
  return `${days}d ${leftoverHours}h`;
}

function groupTimeByType(items: Item[]) {
  if (!items.length) return [];
  const totalMinutes = items.reduce((sum, item) => sum + (item.runtimeMinutes ?? 0), 0) || 1;
  const map = new Map<string, number>();
  for (const item of items) {
    const minutes = item.runtimeMinutes ?? 0;
    map.set(item.type, (map.get(item.type) ?? 0) + minutes);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, minutes]) => ({
      type,
      minutes,
      pct: Math.max(6, Math.round((minutes / totalMinutes) * 100)),
    }));
}

function buildActivitySeries(items: Item[]) {
  const now = new Date();
  const months: { key: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleString("default", { month: "short" });
    months.push({ key, label, count: 0 });
  }

  for (const item of items) {
    const date = item.completedAt ?? item.updatedAt ?? item.createdAt;
    if (!date) continue;
    const d = new Date(date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const month = months.find((m) => m.key === key);
    if (month) month.count += 1;
  }

  const max = Math.max(...months.map((m) => m.count), 1);
  return months.map((m) => ({
    ...m,
    height: max ? Math.round((m.count / max) * 100) : 0,
  }));
}

function buildHeatmap(items: Item[]) {
  const days = 84;
  const today = new Date();
  const counts = new Map<string, number>();
  for (const item of items) {
    const date = item.completedAt ?? item.updatedAt ?? item.createdAt;
    if (!date) continue;
    const iso = new Date(date).toISOString().slice(0, 10);
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }

  const cells: { key: string; count: number; label: string }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    cells.push({
      key,
      count: counts.get(key) ?? 0,
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }

  const max = Math.max(...cells.map((c) => c.count), 1);
  return { cells, max };
}

function topTokens(items: Item[], fields: Array<"genres" | "tags" | "studios">, limit = 5) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const field of fields) {
      const value = item[field];
      if (!value) continue;
      const tokens =
        field === "tags" ? tagsToArray(value) : value.split(",").map((t) => t.trim()).filter(Boolean);
      for (const token of tokens) {
        const key = token.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function heatColor(count: number, max: number) {
  if (count === 0) return "rgba(255,255,255,0.08)";
  const intensity = Math.min(1, count / Math.max(max, 1));
  const start = [124, 58, 237];
  const end = [56, 189, 248];
  const mix = start.map((v, idx) => Math.round(v + (end[idx] - v) * intensity));
  return `rgba(${mix[0]}, ${mix[1]}, ${mix[2]}, ${0.45 + intensity * 0.35})`;
}
