import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Recommendation } from "@/lib/recommendations";

export function Recommendations({ recommendations }: { recommendations: Recommendation[] }) {
  if (!recommendations.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Because you watched</p>
          <h2 className="text-xl font-semibold">Recommendations</h2>
        </div>
        <Badge variant="outline">TMDB + your tags</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((rec, idx) => (
          <Card
            key={`${rec.title}-${idx}`}
            className="flex gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-3 shadow-card"
          >
            <Poster posterUrl={rec.posterUrl} title={rec.title} />
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold leading-tight">{rec.title}</p>
                    {rec.year && (
                      <Badge variant="outline" className="text-[10px]">
                        {rec.year}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-primary">{rec.reason}</p>
                </div>
              </div>
              {rec.overview && (
                <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">
                  {rec.overview}
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Poster({ posterUrl, title }: { posterUrl?: string; title: string }) {
  if (!posterUrl) {
    return (
      <div className="surface-muted flex h-24 w-16 items-center justify-center rounded-lg border border-dashed border-border/60 text-[10px] text-muted-foreground">
        No poster
      </div>
    );
  }
  return (
    <div className="relative h-24 w-16 overflow-hidden rounded-lg border border-border/70 shadow-inner">
      <Image src={posterUrl} alt={title} fill sizes="80px" className="object-cover" />
    </div>
  );
}
