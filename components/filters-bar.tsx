"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Filter, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ITEM_TYPES, STATUSES } from "@/lib/constants";

type Props = {
  type?: string;
  status?: string;
  q?: string;
};

export function FiltersBar({ type, status, q }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = (key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  const onSearch = (formData: FormData) => {
    const value = (formData.get("q") as string)?.trim();
    updateParam("q", value || undefined);
  };

  const onReset = () => {
    startTransition(() => router.push("/"));
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <Select value={type ?? "all"} onValueChange={(v) => updateParam("type", v)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ITEM_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status ?? "all"}
          onValueChange={(v) => updateParam("status", v)}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <form
          action={onSearch}
          className="flex w-full flex-col gap-2 sm:flex-row sm:flex-1 sm:items-center"
        >
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search title..."
            className="w-full"
          />
          <Button type="submit" variant="secondary" disabled={isPending} className="w-full sm:w-auto">
            Search
          </Button>
        </form>
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={isPending}
          className="w-full sm:ml-auto sm:w-auto"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
