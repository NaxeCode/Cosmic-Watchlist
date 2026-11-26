import { DemoAnalytics } from "@/components/demo-analytics";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { ITEM_TYPES, STATUSES } from "@/lib/constants";
import { buildRecommendationsFromItems } from "@/lib/recommendations";
import { DEMO_ITEMS } from "@/lib/demo-data";

type SearchParam =
  | Promise<Record<string, string | string[] | undefined>>
  | Record<string, string | string[] | undefined>;

async function getParams(searchParams: SearchParam) {
  return (await Promise.resolve(searchParams)) ?? {};
}

export default async function Demo({ searchParams }: { searchParams: SearchParam }) {
  const session = await auth();
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

  const typeFilter = typeParam && ITEM_TYPES.includes(typeParam as any) ? typeParam : undefined;
  const statusFilter = statusParam && STATUSES.includes(statusParam as any) ? statusParam : undefined;
  const requestedTags = tagValue
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.toLowerCase());

  const shuffled = shuffleItems(DEMO_ITEMS);
  const filtered = shuffled.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false;
    if (statusFilter && item.status !== statusFilter) return false;

    if (queryValue) {
      const query = queryValue.toLowerCase();
      const inTitle = item.title.toLowerCase().includes(query);
      const inTags = (item.tags ?? "").toLowerCase().includes(query);
      if (!inTitle && !inTags) return false;
    }

    if (requestedTags.length) {
      const tagString = (item.tags ?? "").toLowerCase();
      const allMatch = requestedTags.every((tag) => tagString.includes(tag));
      if (!allMatch) return false;
    }

    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const results = filtered.slice(start, start + pageSize);

  const uniqueTags = Array.from(
    new Set(
      DEMO_ITEMS.flatMap((row) => (row.tags ?? "").split(","))
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const uniqueTitles = Array.from(new Set(DEMO_ITEMS.map((i) => i.title))).sort((a, b) =>
    a.localeCompare(b),
  );

  const recommendations = await buildRecommendationsFromItems(DEMO_ITEMS);

  // Calculate stats for header
  const completed = DEMO_ITEMS.filter((item) => item.status === "completed");
  const minutesWatched = completed.reduce((sum, item) => sum + (item.runtimeMinutes ?? 0), 0);
  const hoursWatched = Math.round(minutesWatched / 60);
  const completionRate = Math.round((completed.length / Math.max(DEMO_ITEMS.length, 1)) * 100);
  const ratedItems = DEMO_ITEMS.filter((item) => item.rating !== null && item.rating !== undefined);
  const avgRating =
    ratedItems.reduce((sum, item) => sum + (item.rating ?? 0), 0) /
    Math.max(ratedItems.length, 1);

  const headerStats = [
    {
      label: "Total Items",
      value: DEMO_ITEMS.length,
      trend: `${completionRate}%`,
    },
    {
      label: "Completed",
      value: completed.length,
    },
    {
      label: "Hours Logged",
      value: `${hoursWatched}h`,
    },
    {
      label: "Avg Rating",
      value: avgRating > 0 ? avgRating.toFixed(1) : "—",
    },
  ];

  return (
    <>
      <DashboardShell
        userImage={session?.user?.image ?? null}
        userName={session?.user?.name ?? null}
        stats={headerStats}
        isAdmin={false}
        isSignedIn={Boolean(session?.user?.id)}
        aiAvailable={false}
        results={results}
        allItems={DEMO_ITEMS}
        allItemsForCommand={DEMO_ITEMS}
        page={safePage}
        totalPages={totalPages}
        total={total}
        params={params}
        pageSize={pageSize}
        typeParam={typeParam}
        statusParam={statusParam}
        qParam={queryValue}
        tagValue={tagValue}
        uniqueTags={uniqueTags}
        uniqueTitles={uniqueTitles}
        collapsedSections={[]}
        recommendations={recommendations}
        isDemo
        basePath="/demo"
      />
      {!session?.user && <DemoAnalytics />}
    </>
  );
}

function shuffleItems<T>(items: T[]) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
