"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

type Params = Record<string, string | string[] | undefined>;

export function PaginationControls({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: Params;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const changePage = (targetPage: number) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (key === "page") return;
      if (Array.isArray(value)) {
        value.forEach((v) => search.append(key, v));
      } else if (value) {
        search.set(key, value);
      }
    });
    search.set("page", String(targetPage));
    startTransition(() => {
      router.push(`/?${search.toString()}`, { scroll: false });
    });
  };

  const windowed = buildPageWindow(page, totalPages);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
      <div>
        Page {page} of {totalPages}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1 || pending}
          onClick={() => changePage(page - 1)}
        >
          Prev
        </Button>
        {windowed.map((entry, idx) =>
          entry === "…" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={entry}
              variant={entry === page ? "default" : "secondary"}
              size="sm"
              className={entry === page ? "pointer-events-none" : ""}
              disabled={pending}
              onClick={() => changePage(entry)}
            >
              {entry}
            </Button>
          ),
        )}
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages || pending}
          onClick={() => changePage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function buildPageWindow(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | "…"> = [];
  const add = (n: number | "…") => pages.push(n);

  add(1);
  if (current > 3) add("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) add(i);

  if (current < total - 2) add("…");
  add(total);

  return pages;
}
