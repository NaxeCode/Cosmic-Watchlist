import Link from "next/link";
import { desc, eq, isNull, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Status, updateEventStatusAction } from "./actions";

type Status = "open" | "done" | "archived";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams?: { status?: string | string[] };
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return redirect("/");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { admin: true },
  });
  if (!user?.admin) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-10">
        <Badge variant="outline" className="w-fit">Admin</Badge>
        <Card className="rounded-2xl border border-border/70 bg-secondary/40 p-6 shadow-card">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is for admin accounts only. If you should have access, add your email to
            <code className="mx-1 rounded bg-black/30 px-1 py-0.5 text-xs">ADMIN_EMAILS</code>,
            redeploy, then sign out and sign back in.
          </p>
        </Card>
      </main>
    );
  }

  const statusFilter = normalizeStatus(searchParams?.status) ?? "open";
  const whereClause =
    statusFilter === "all"
      ? undefined
      : statusFilter === "open"
        ? or(isNull(events.status), eq(events.status, statusFilter as Status))
        : eq(events.status, statusFilter as Status);

  let rows: (typeof events.$inferSelect)[] = [];
  try {
    rows = await db.query.events.findMany({
      ...(whereClause ? { where: whereClause } : {}),
      orderBy: [desc(events.createdAt)],
      limit: 200,
    });
  } catch (error) {
    return (
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10">
        <Badge variant="glow" className="w-fit text-xs uppercase tracking-[0.2em]">
          Admin
        </Badge>
        <Card className="rounded-2xl border border-border/70 bg-secondary/40 p-6 text-sm text-muted-foreground">
          <h1 className="text-lg font-semibold text-foreground">Events table out of sync</h1>
          <p className="mt-2">
            We couldn&apos;t query <code className="rounded bg-black/30 px-1 py-0.5">events.status</code>.
            Make sure the latest schema is applied (run <code className="rounded bg-black/30 px-1 py-0.5">npm run db:push</code> against your DB).
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-foreground/90">
            {(error as Error)?.message ?? String(error)}
          </pre>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <Badge variant="glow" className="text-xs uppercase tracking-[0.2em]">
          Admin
        </Badge>
        <h1 className="text-2xl font-semibold">Feedback & bug reports</h1>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <a href="/">← Home</a>
        </Button>
      </div>
      <StatusFilters active={statusFilter} />
      {rows.length === 0 ? (
        <Card className="rounded-2xl border border-border/70 bg-secondary/40 p-6 text-sm text-muted-foreground">
          No submissions yet.
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card
              key={row.id}
              className="rounded-2xl border border-border/70 bg-secondary/40 p-4 shadow-card"
            >
              <Header row={row} />
              <Details row={row} />
              <Actions id={row.id} status={row.status as Status} />
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function Header({ row }: { row: (typeof events.$inferSelect) }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Badge variant="outline" className="capitalize">{row.name.replace("_", " ")}</Badge>
      <Badge variant={row.status === "open" ? "glow" : "outline"} className="capitalize">
        {row.status}
      </Badge>
      {row.userId && <Badge variant="outline">user {row.userId}</Badge>}
      <span className="ml-auto text-xs">{row.createdAt?.toISOString()}</span>
    </div>
  );
}

function Details({ row }: { row: (typeof events.$inferSelect) }) {
  const payload = (row.payload ?? {}) as Record<string, any>;
  const view = buildView(row.name, payload);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Summary</h3>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">{view.summary}</p>
        {view.meta && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {view.meta.map((m) => (
              <Badge key={m.label + m.value} variant="outline">
                {m.label}: {m.value}
              </Badge>
            ))}
          </div>
        )}
      </div>
      {view.details && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Details</h3>
          <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs leading-relaxed text-foreground/90">
            {view.details}
          </pre>
        </div>
      )}
    </div>
  );
}

function Actions({ id, status }: { id: number; status: Status }) {
  return (
    <div className="flex flex-wrap items-center gap-2 pt-3">
      {status !== "open" && (
        <StatusButton id={id} next="open" label="Reopen" variant="outline" />
      )}
      {status !== "done" && (
        <StatusButton id={id} next="done" label="Mark done" variant="default" />
      )}
      {status !== "archived" && (
        <StatusButton id={id} next="archived" label="Archive" variant="secondary" />
      )}
    </div>
  );
}

function StatusButton({
  id,
  next,
  label,
  variant,
}: {
  id: number;
  next: Status;
  label: string;
  variant: "default" | "outline" | "secondary";
}) {
  return (
    <form action={updateEventStatusAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}

function StatusFilters({ active }: { active: string }) {
  const filters: Array<{ label: string; value: string }> = [
    { label: "Open", value: "open" },
    { label: "Done", value: "done" },
    { label: "Archived", value: "archived" },
    { label: "All", value: "all" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <Link
          key={f.value}
          href={`/admin/feedback?status=${f.value}`}
          prefetch={false}
          className={`rounded-full border px-3 py-1 text-sm transition ${
            active === f.value
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-border/60 bg-black/20 text-muted-foreground hover:border-primary/40 hover:text-foreground"
          }`}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}

function normalizeStatus(value?: string | string[] | null) {
  if (!value) return undefined;
  const nextVal = Array.isArray(value) ? value[0] : value;
  const next = nextVal.toLowerCase();
  if (["open", "done", "archived", "all"].includes(next)) return next;
  return undefined;
}

function buildView(name: string, payload: Record<string, any>) {
  if (name === "bug_reported") {
    return {
      summary: payload.summary || "Bug report",
      meta: [
        payload.severity ? { label: "Severity", value: payload.severity } : null,
        payload.frequency ? { label: "Frequency", value: payload.frequency } : null,
        payload.email ? { label: "Email", value: payload.email } : null,
        payload.url ? { label: "URL", value: payload.url } : null,
      ].filter(Boolean) as { label: string; value: string }[],
      details: [
        payload.steps ? `Steps:\n${payload.steps}` : null,
        payload.expected ? `Expected:\n${payload.expected}` : null,
        payload.actual ? `Actual:\n${payload.actual}` : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  if (name === "feedback_submitted") {
    return {
      summary: payload.message || "Feedback",
      meta: [
        payload.area ? { label: "Area", value: payload.area } : null,
        payload.sentiment ? { label: "Sentiment", value: payload.sentiment } : null,
        payload.email ? { label: "Email", value: payload.email } : null,
      ].filter(Boolean) as { label: string; value: string }[],
      details: Object.keys(payload).length ? JSON.stringify(payload, null, 2) : "",
    };
  }

  return {
    summary: JSON.stringify(payload, null, 2) || "Event",
    meta: [],
    details: "",
  };
}
