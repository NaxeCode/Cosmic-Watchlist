"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Tag as TagIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITEM_TYPES } from "@/lib/constants";

type Params = Record<string, string | string[] | undefined>;

export function ItemSearch({
  currentTitle,
  currentTag,
  currentType,
  params,
  uniqueTags,
  titles = [],
}: {
  currentTitle: string;
  currentTag: string;
  currentType?: string;
  params: Params;
  uniqueTags: string[];
  titles?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [titleValue, setTitleValue] = useState(currentTitle);
  const [lockedTitle, setLockedTitle] = useState(currentTitle || null);
  const [typeFilter, setTypeFilter] = useState<string>(currentType ?? "");
  const tagAreaRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const initialTags = useMemo(() => {
    return (currentTag || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [currentTag]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(initialTags);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (value: string) => {
    const formatted = capitalize(value);
    if (!formatted) return;
    setTags((prev) => (prev.includes(formatted) ? prev : [...prev, formatted]));
    setTagInput("");
    setShowSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((t) => t !== value));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = (lockedTitle || (form.get("q") as string))?.trim();

    const next = new URLSearchParams(searchParams.toString());
    // reset page when searching
    next.set("page", "1");

    if (title) next.set("q", title);
    else next.delete("q");

    if (tags.length) next.set("tag", tags.join(", "));
    else next.delete("tag");

    startTransition(() => {
      if (typeFilter && typeFilter !== "all") next.set("type", typeFilter);
      else next.delete("type");

      router.push(`/?${next.toString()}`, { scroll: false });
    });
    setShowSuggestions(false);
  };

  const filteredTags = useMemo(() => {
    const lower = tagInput.toLowerCase();
    const selectedSet = new Set(tags.map((t) => t.toLowerCase()));
    return uniqueTags
      .filter((tag) => {
        const lowerTag = tag.toLowerCase();
        return lowerTag.includes(lower) && !selectedSet.has(lowerTag);
      })
      .slice(0, 8);
  }, [tagInput, uniqueTags, tags]);

  const titleSuggestions = useMemo(() => {
    const lower = titleValue.toLowerCase();
    if (!lower) return [];
    return titles
      .filter((t) => t.toLowerCase().includes(lower))
      .filter((t) => t.toLowerCase() !== lower)
      .slice(0, 6);
  }, [titleValue, titles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagAreaRef.current && !tagAreaRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 items-start gap-4 rounded-2xl border border-border/60 bg-secondary/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-busy={isPending}
    >
      <div className="min-w-0 space-y-2 lg:col-span-2">
        <label className="text-xs text-muted-foreground" htmlFor="q">
          Title
        </label>
        <div className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring">
          {lockedTitle && (
            <>
              <input type="hidden" name="q" value={lockedTitle} />
              <button
                type="button"
                className="surface-muted inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-sm font-medium capitalize transition hover:border-destructive/70 hover:text-destructive"
                onClick={() => {
                  setLockedTitle(null);
                  setTitleValue("");
                }}
              >
                {lockedTitle}
                <span className="text-xs">x</span>
              </button>
            </>
          )}
          {!lockedTitle && (
            <Input
              id="q"
              name="q"
              placeholder="Search title..."
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              autoComplete="off"
              className="h-auto flex-1 border-0 bg-transparent p-0 text-sm shadow-none outline-none focus-visible:ring-0"
            />
          )}
        </div>
        {titleSuggestions.length > 0 && !lockedTitle && (
          <div className="space-y-1 rounded-lg border border-border/60 bg-popover p-2 shadow-card">
            <div className="text-xs font-semibold text-muted-foreground">Suggestions</div>
            <div className="max-h-48 overflow-y-auto">
              {titleSuggestions.map((title) => (
                <button
                  type="button"
                  key={title}
                  className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                  onClick={() => {
                    setTitleValue(title);
                    setLockedTitle(title);
                  }}
                >
                  <span className="font-medium">{title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-2">
        <label className="text-xs text-muted-foreground">Type</label>
        <Select
          value={typeFilter || "all"}
          onValueChange={(v) => {
            const nextType = v === "all" ? "" : v;
            setTypeFilter(nextType);

            const title = (lockedTitle || titleValue)?.trim();
            const next = new URLSearchParams(searchParams.toString());
            next.set("page", "1");

            if (title) next.set("q", title);
            else next.delete("q");

            if (tags.length) next.set("tag", tags.join(", "));
            else next.delete("tag");

            if (nextType) next.set("type", nextType);
            else next.delete("type");

            startTransition(() => {
              router.push(`/?${next.toString()}`, { scroll: false });
            });
          }}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {ITEM_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-2">
        <label className="text-xs text-muted-foreground" htmlFor="tag">
          Tags
        </label>
        <div className="flex items-start gap-2" ref={tagAreaRef}>
          <div className="relative flex-1 space-y-2">
            <Input
              id="tag"
              name="tag"
              ref={tagInputRef}
              value=""
              readOnly
              placeholder="Select tags"
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
              onClick={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredTags.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-border/60 bg-popover shadow-card">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">Suggestions</div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      className="flex w-full cursor-pointer items-center px-3 py-2 text-left text-sm transition hover:bg-secondary/70 hover:text-foreground"
                      onClick={() => addTag(tag)}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <TagIcon className="mr-2 h-4 w-4" />
                      {capitalize(tag)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="surface-muted group inline-flex items-center gap-1 rounded-full border border-border/70 px-3 py-1 text-xs capitalize"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => removeTag(tag)}
                    className="rounded-full p-1 text-muted-foreground transition hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-start sm:col-span-2 lg:col-span-1">
        <Button
          type="submit"
          size="sm"
          className="w-full gap-1 sm:w-auto"
          disabled={isPending}
        >
          {isPending ? "Updating..." : "Search"}
        </Button>
      </div>
    </form>
  );
}

function capitalize(value: string) {
  const t = value.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
