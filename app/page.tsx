import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { items, users } from "@/db/schema";
import { ItemForm } from "@/components/item-form";
import { FiltersBar } from "@/components/filters-bar";
import { ItemSearch } from "@/components/item-search";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ITEM_TYPES, STATUSES } from "@/lib/constants";
import { AuthButtons } from "@/components/auth-buttons";
import Image from "next/image";
import { ImportLetterboxd } from "@/components/import-letterboxd";
import { ItemsView } from "@/components/items-view";
import { SharePanel } from "@/components/share-panel";
import { SmartStats } from "@/components/smart-stats";
import { buildRecommendationsFromItems } from "@/lib/recommendations";
import { Recommendations } from "@/components/recommendations";
import { FeedbackPanel } from "@/components/feedback-panel";

type SearchParam =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

async function getParams(searchParams: SearchParam) {
  return (await Promise.resolve(searchParams)) ?? {};
}

export default async function Home({ searchParams }: { searchParams: SearchParam }) {
  const session = await auth();
  const userId = session?.user?.id;
  const userImage = session?.user?.image ?? null;
  const isAdmin = !!session?.user?.admin;
  const aiAvailable = Boolean(process.env.OPENAI_API_KEY);
  const params = await getParams(searchParams);
  const typeParam = Array.isArray(params.type) ? params.type[0] : params.type;
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status;
  const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const tagParam = Array.isArray(params.tag) ? params.tag[0] : params.tag;
  const tagValue = (tagParam ?? "").trim();
  const queryValue = (qParam ?? "").trim();
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const pageSizeParam = Array.isArray(params.pageSize) ? params.pageSize[0] : params.pageSize;
  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = Math.min(100, Math.max(10, Number(pageSizeParam) || 10));

  if (!userId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-[#0f1020] via-[#0b0c18] to-[#070710] p-10 shadow-card text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.16),transparent_32%)] blur-[1px]" />
          <div className="relative space-y-4">
            <Badge variant="glow" className="text-xs uppercase tracking-[0.2em]">
              Cosmic watchlist
            </Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Sign in with Google to unlock your watchlist
            </h1>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground">
              Keep your anime, movies, TV, YouTube, and games in one place. Edits, filters, and ratings sync to your account instantly.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Private to your account</Badge>
              <Badge variant="outline">Google sign-in</Badge>
              <Badge variant="outline">Server actions</Badge>
            </div>
            <div className="flex justify-center pt-2">
              <AuthButtons isSignedIn={false} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const conditions = [];

  const allUserItems = await db.query.items.findMany({
    where: eq(items.userId, userId),
    orderBy: [desc(items.createdAt)],
  });

  const typeFilter = typeParam && ITEM_TYPES.includes(typeParam as any) ? (typeParam as (typeof ITEM_TYPES)[number]) : undefined;
  const statusFilter =
    statusParam && STATUSES.includes(statusParam as any)
      ? (statusParam as (typeof STATUSES)[number])
      : undefined;

  if (typeFilter) {
    conditions.push(eq(items.type, typeFilter));
  }
  if (statusFilter) {
    conditions.push(eq(items.status, statusFilter));
  }
  if (queryValue) {
    conditions.push(
      or(
        ilike(items.title, `%${queryValue}%`),
        ilike(sql`coalesce("items"."tags", '')`, `%${queryValue}%`),
      ),
    );
  }
  if (tagValue) {
    conditions.push(ilike(sql`coalesce("items"."tags", '')`, `%${tagValue}%`));
  }

  const whereClause = conditions.length
    ? and(eq(items.userId, userId), ...conditions)
    : eq(items.userId, userId);

  const [{ count }] =
    (await db
      .select({ count: sql<number>`count(*)` })
      .from(items)
      .where(whereClause)) ?? [{ count: 0 }];

  const total = Number(count) || 0;

  const results = await db.query.items.findMany({
    where: whereClause,
    orderBy: [desc(items.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const allItemsForCommand = (await db.query.items.findMany({
    where: whereClause,
    orderBy: [desc(items.createdAt)],
  })) as any[];

  const uniqueTags = Array.from(
    new Set(
      allUserItems
        .flatMap((row) => (row.tags ?? "").split(","))
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));
  const uniqueTitles = Array.from(new Set(allUserItems.map((i) => i.title))).sort((a, b) =>
    a.localeCompare(b),
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const statusCounts = await db
    .select({
      status: items.status,
      count: sql<number>`count(*)`,
    })
    .from(items)
    .where(whereClause)
    .groupBy(items.status);

  const statusMap = new Map(statusCounts.map((row) => [row.status, Number(row.count)]));
  const statusStats = STATUSES.map((status) => ({
    status,
    count: statusMap.get(status) ?? 0,
  }));

  const tagCounts = allUserItems
    .flatMap((row) => (row.tags ?? "").split(","))
    .map((t) => t.trim())
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const avgRatingRow =
    (await db
      .select({ avg: sql<number>`avg("items"."rating")` })
      .from(items)
      .where(whereClause)) ?? [{ avg: null }];
  const avgRating = Number(avgRatingRow[0]?.avg ?? 0);

  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { publicHandle: true, publicEnabled: true },
  });

  const recommendations = await buildRecommendationsFromItems(allUserItems);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-[#0f1020] via-[#0b0c18] to-[#070710] p-8 shadow-card">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.28),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.16),transparent_32%)] blur-[1px]" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <Badge variant="glow" className="text-sm uppercase tracking-[0.22em] px-4 py-2">
              Stargazers💫 Cosmic Watchlist
            </Badge>
            <p className="text-base uppercase tracking-[0.2em] text-muted-foreground">
              Personal Watch HQ
            </p>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              <span className="bg-gradient-to-r from-[#c4b5fd] via-[#a78bfa] to-[#f472b6] bg-clip-text text-transparent animate-[gradient-shift_10s_ease_infinite]">
                Track everything you watch
              </span>
              <br />
              <span className="text-foreground">with cosmic clarity.</span>
            </h1>
            <p className="max-w-2xl text-base text-muted-foreground">
              Dark, glassy, server-first watchlist with inline editing, filters, and type-safe mutations. Built for late-night sessions and focused vibes.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Server Actions</Badge>
              <Badge variant="outline">Drizzle + Postgres</Badge>
              <Badge variant="outline">Zod validation</Badge>
              <Badge variant="outline">Framer Motion</Badge>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-black/30 p-5 shadow-inner backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
              <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
              Quick stats
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusStats.map((row) => (
                  <TableRow key={row.status}>
                    <TableCell className="capitalize">{row.status}</TableCell>
                    <TableCell>{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              Press ⌘/Ctrl + K for the command palette.
            </p>
            <div className="flex items-center gap-3 pt-1">
              {userImage && (
                <div className="h-10 w-10 overflow-hidden rounded-full border border-border/80 shadow-inner">
                  <Image
                    src={userImage}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <AuthButtons isSignedIn={!!userId} />
              {isAdmin && (
                <a
                  href="/admin/feedback"
                  className="text-xs text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Feedback & bug reports
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <SmartStats items={allUserItems} />
      <Recommendations recommendations={recommendations} />

      <FiltersBar type={typeParam} status={statusParam} q={qParam} />
      {userId ? (
        <ItemForm />
      ) : (
        <div className="rounded-2xl border border-border/70 bg-secondary/50 p-6 text-sm text-muted-foreground">
          Sign in with Google to start adding to your watchlist.
          <div className="mt-3">
            <AuthButtons isSignedIn={false} />
          </div>
        </div>
      )}
      {userId && (
        <>
          <ImportLetterboxd />
          <SharePanel
            initialHandle={userRow?.publicHandle ?? null}
            initialEnabled={userRow?.publicEnabled ?? false}
          />
          <FeedbackPanel />
        </>
      )}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Your items</h2>
            <p className="text-sm text-muted-foreground">
              Showing {results.length} item{results.length === 1 ? "" : "s"} sorted by latest.
            </p>
          </div>
        </div>
        <ItemSearch
          currentTitle={queryValue}
          currentTag={tagValue}
          currentType={typeParam}
          params={params}
          uniqueTags={uniqueTags}
          titles={uniqueTitles}
        />
        {userId ? (
          results.length === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-secondary/40 p-6 text-center text-muted-foreground">
              Nothing here yet. Add your first item to begin tracking.
            </div>
          ) : (
            <ItemsView
              items={results}
              allItems={allItemsForCommand}
              page={page}
              totalPages={totalPages}
              total={total}
              params={params}
              pageSize={pageSize}
              aiAvailable={aiAvailable}
            />
          )
        ) : (
          <div className="rounded-2xl border border-border/70 bg-secondary/40 p-6 text-center text-muted-foreground">
            Sign in to see your personalized watchlist.
          </div>
        )}
      </section>
    </main>
  );
}
