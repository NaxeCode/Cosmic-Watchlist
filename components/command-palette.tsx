"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
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
import { STATUSES } from "@/lib/constants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bulkUpdateStatusAction } from "@/app/actions";

type MinimalItem = {
  id: number;
  title: string;
  status: string;
  type: string;
};

export function CommandPalette({
  withTrigger = false,
  items = [],
}: {
  withTrigger?: boolean;
  items?: MinimalItem[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [pending, startTransition] = useTransition();

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

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => setSelected(items.map((i) => i.id));
  const clearAll = () => setSelected([]);

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
        setSelected([]);
        setOpen(false);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      {withTrigger && (
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <Search className="h-4 w-4" />
          Command
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex flex-col gap-3 px-5 pt-5">
          <div className="text-sm text-muted-foreground">
            Search your entire library, select items, and bulk update status.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CommandInput placeholder="Search items by title..." />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{selected.length} selected</Badge>
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={!items.length}>
                Select all
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={!selected.length}>
                Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="h-10 w-[200px]">
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
            <Button
              variant="default"
              size="sm"
              disabled={pending || !selected.length || !status}
              onClick={onBulkUpdate}
            >
              {pending ? "Updating..." : "Apply to selected"}
            </Button>
          </div>
        </div>
        <CommandList className="custom-scroll max-h-[520px] overflow-y-auto px-3 pb-3">
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup heading="Items" className="px-2">
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={item.title}
                onSelect={() => toggleSelect(item.id)}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 px-3 py-3 text-sm shadow-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
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
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
    </>
  );
}
