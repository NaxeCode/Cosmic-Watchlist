"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ITEM_TYPES, STATUSES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkUpdateStatusAction } from "@/app/actions";

type MinimalItem = {
  id: number;
  title: string;
  status: string;
  type: string;
  tags?: string | null;
};

export function CommandPalette({
  withTrigger = false,
  items = [],
  selected: controlledSelected,
  onSelectedChange,
}: {
  withTrigger?: boolean;
  items?: MinimalItem[];
  selected?: number[];
  onSelectedChange?: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [internalSelected, setInternalSelected] = useState<number[]>([]);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const selected = controlledSelected ?? internalSelected;
  const setSelected = onSelectedChange ?? setInternalSelected;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const applySelection = (next: number[]) => {
    if (onSelectedChange) onSelectedChange(next);
    else setInternalSelected(next);
  };

  const toggleSelect = (id: number) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    applySelection(next);
  };

  const selectAll = () => applySelection(items.map((i) => i.id));
  const clearAll = () => applySelection([]);

  const filteredItems = useMemo(() => {
    if (!typeFilter) return items;
    return items.filter((i) => i.type === typeFilter);
  }, [items, typeFilter]);

  const onBulkUpdate = () => {
    if (!selected.length) {
      toast.error("Select at least one item");
      return;
    }
    if (!status) {
      toast.error("Choose a status");
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.append("ids", selected.join(","));
      formData.append("status", status);
      const res = await bulkUpdateStatusAction(undefined, formData);
      if (res?.success) {
        toast.success(res.success);
        applySelection([]);
        setOpen(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  const commandContent = (
    <>
      <div className="flex flex-col gap-3 px-5 pt-5">
        <p className="sr-only">Command Palette</p>
        <div className="text-sm text-muted-foreground">
          Search your entire library, select items, and bulk update status.
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <CommandInput placeholder="Search items by title..." className="w-full" />
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="w-fit">
              {selected.length} selected
            </Badge>
            <Button variant="ghost" size="sm" onClick={selectAll} disabled={!items.length} className="w-full sm:w-auto">
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={!selected.length} className="w-full sm:w-auto">
              Clear
            </Button>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 sm:items-center">
          <Select value={status} onValueChange={(v) => setStatus(v)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Bulk status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter ?? "all"} onValueChange={(v) => setTypeFilter(v === "all" ? undefined : v)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            size="sm"
            disabled={pending || !selected.length || !status}
            onClick={onBulkUpdate}
            className="w-full sm:w-auto"
          >
            {pending ? "Updating..." : "Apply to selected"}
          </Button>
        </div>
      </div>
      <CommandList className="custom-scroll max-h-[70vh] overflow-y-auto px-3 pb-3">
        <CommandEmpty>No items found.</CommandEmpty>
        <CommandGroup heading="Items" className="px-2">
          {filteredItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.title} ${item.tags ?? ""}`}
              onSelect={() => toggleSelect(item.id)}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 px-3 py-3 text-sm shadow-sm"
            >
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-primary"
                checked={selected.includes(item.id)}
                readOnly
              />
              <span className="flex-1 truncate">{item.title}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {item.type}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {item.status}
              </Badge>
              {item.tags && (
                <Badge variant="outline" className="text-[10px]">
                  {item.tags.toString()}
                </Badge>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </>
  );

  return (
    <>
      {withTrigger && <CommandTriggerButton onClick={() => setOpen(true)} />}
      {isMobile ? (
        open && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-x-0 bottom-0 mx-auto max-w-2xl rounded-t-2xl border border-border/60 bg-background pb-3 shadow-xl">
              <div className="flex items-center justify-between px-4 pt-3">
                <p className="text-sm font-semibold">Command palette</p>
                <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </div>
              <Command className="mt-2 border-t border-border/50">
                {commandContent}
              </Command>
            </div>
          </div>
        )
      ) : (
        <CommandDialog open={open} onOpenChange={setOpen}>
          {commandContent}
        </CommandDialog>
      )}
    </>
  );
}

type Particle = {
  id: number;
  angle: number;
  radius: number;
  speed: number;
  drift: number;
  rMin: number;
  rMax: number;
  depth: number;
  depthSpeed: number;
  depthMin: number;
  depthMax: number;
  tilt: number;
  tiltSpeed: number;
};

function createParticles(count = 5): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const baseRadius = 30 + Math.random() * 18;
    return {
      id: i,
      angle: Math.random() * Math.PI * 2,
      radius: baseRadius,
      speed: 0.6 + Math.random() * 0.6,
      drift: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 6),
      rMin: baseRadius - 6,
      rMax: baseRadius + 14,
      depth: 0.7 + Math.random() * 0.4,
      depthSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.15 + Math.random() * 0.1),
      depthMin: 0.5,
      depthMax: 1.25,
      tilt: Math.random() * Math.PI * 2,
      tiltSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.6),
    };
  });
}

function CommandTriggerButton({ onClick }: { onClick: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
    setParticles(createParticles());

    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      setParticles((prev) =>
        prev.map((p) => {
          let angle = p.angle + p.speed * dt * 2 * Math.PI;
          let radius = p.radius + p.drift * dt;
          let drift = p.drift;
          if (radius > p.rMax || radius < p.rMin) {
            drift = -drift;
            radius = Math.min(Math.max(radius, p.rMin), p.rMax);
          }

          let depth = p.depth + p.depthSpeed * dt;
          let depthSpeed = p.depthSpeed;
          if (depth > p.depthMax || depth < p.depthMin) {
            depthSpeed = -depthSpeed;
            depth = Math.min(Math.max(depth, p.depthMin), p.depthMax);
          }

          const tilt = p.tilt + p.tiltSpeed * dt;

          return { ...p, angle, radius, drift, depth, depthSpeed, tilt };
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Button
      type="button"
      variant="secondary"
      className="cosmic-button relative gap-2 overflow-visible"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 -z-10" aria-hidden />
      {mounted && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {particles.map((p) => {
            const x = Math.cos(p.angle) * p.radius;
            const y = Math.sin(p.angle) * p.radius;
            const tiltX = x * Math.cos(p.tilt) - y * Math.sin(p.tilt);
            const tiltY = x * Math.sin(p.tilt) + y * Math.cos(p.tilt);
            const size = Math.max(3, 4 * p.depth);
            const opacity = 0.6 + (p.depth - p.depthMin) / (p.depthMax - p.depthMin + 0.0001) * 0.25;
            return (
              <span
                key={p.id}
                className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                style={{
                  top: "50%",
                  left: "50%",
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity,
                  transform: `translate(-50%, -50%) translate(${tiltX}px, ${tiltY}px)`,
                }}
              />
            );
          })}
        </div>
      )}
      <Search className="h-4 w-4" />
      Command
    </Button>
  );
}
