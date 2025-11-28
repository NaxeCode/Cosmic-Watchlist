"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Tag as TagIcon, Plus } from "lucide-react";

type Params = Record<string, string | string[] | undefined>;

export function ItemSearch({
  currentTitle,
  currentTag,
  params,
  uniqueTags,
}: {
  currentTitle: string;
  currentTag: string;
  params: Params;
  uniqueTags: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
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
  };

  const removeTag = (value: string) => {
    setTags((prev) => prev.filter((t) => t !== value));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const title = (form.get("q") as string)?.trim();

    const next = new URLSearchParams(searchParams.toString());
    // reset page when searching
    next.set("page", "1");

    if (title) next.set("q", title);
    else next.delete("q");

    if (tags.length) next.set("tag", tags.join(", "));
    else next.delete("tag");

    startTransition(() => {
      router.push(`/?${next.toString()}`, { scroll: false });
    });
    setShowSuggestions(false);
  };

  const filteredTags = useMemo(() => {
    const lower = tagInput.toLowerCase();
    return uniqueTags.filter((tag) => tag.toLowerCase().includes(lower)).slice(0, 8);
  }, [tagInput, uniqueTags]);

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-start gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3"
      aria-busy={isPending}
    >
      <div className="flex min-w-[200px] flex-1 items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor="q">
          Title
        </label>
        <Input id="q" name="q" defaultValue={currentTitle} placeholder="Search title..." />
      </div>
      <div className="flex min-w-[220px] flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-2 text-xs text-muted-foreground">Tags</span>
          <div className="relative flex-1 space-y-2">
            <Input
              id="tag"
              name="tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag and press Enter"
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
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
                  className="group inline-flex items-center gap-1 rounded-full border border-border/70 bg-black/30 px-3 py-1 text-xs capitalize"
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
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => addTag(tagInput)}
            className="mt-1 gap-1 self-start"
          >
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
      </div>
      <Button type="submit" size="sm" className="self-start" disabled={isPending}>
        {isPending ? "Updating…" : "Search"}
      </Button>
    </form>
  );
}

function capitalize(value: string) {
  const t = value.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
