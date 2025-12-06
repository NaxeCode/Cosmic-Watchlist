"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlusCircle, Sparkles, Image as ImageIcon } from "lucide-react";
import { createItemAction } from "@/app/actions";
import { ITEM_TYPES, STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type Suggestion = { title: string; type: string; year?: number; posterUrl?: string };

export function ItemForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [titleValue, setTitleValue] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, startSuggestionsTransition] = useTransition();
  const [typeValue, setTypeValue] = useState<string>("anime");
  const [ratingValue, setRatingValue] = useState<string>("");
  const [lockedTitle, setLockedTitle] = useState<string | null>(null);
  const [autofillPreview, setAutofillPreview] = useState<{
    releaseYear?: number;
    runtimeMinutes?: number;
    synopsis?: string;
    cast?: string[];
    posterUrl?: string | null;
  } | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  useEffect(() => {
    if (lockedTitle) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const trimmed = titleValue.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }
    const controller = new AbortController();
    startSuggestionsTransition(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&type=${encodeURIComponent(typeValue)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json) => {
          if (json?.ok && Array.isArray(json.results)) {
            setSuggestions(json.results);
            setSuggestionsOpen(true);
          } else {
            setSuggestions([]);
            setSuggestionsOpen(false);
          }
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setSuggestions([]);
          setSuggestionsOpen(false);
        });
    });
    return () => controller.abort();
  }, [titleValue, typeValue, lockedTitle]);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createItemAction,
    {},
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
      setAutofillPreview(null);
      setTitleValue("");
      setSuggestions([]);
      setSuggestionsOpen(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = (name: string) => state?.fieldErrors?.[name]?.[0];

  const onAutofill = async () => {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const title = (formData.get("title") as string | null)?.trim();
    const type = (formData.get("type") as string | null)?.trim() || "movie";
    if (!title) {
      toast.error("Enter a title first.");
      return;
    }
    setIsAutofilling(true);
    try {
      const res = await fetch(
        `/api/metadata?title=${encodeURIComponent(title)}&type=${encodeURIComponent(type)}`,
      );
      const json = await res.json();
      if (!json?.ok || !json.metadata) {
        toast.error(json?.error || "No metadata found.");
        return;
      }
      const meta = json.metadata as any;

      // merge genres into tags
      if (meta.genres?.length && tagsRef.current) {
        const existing = tagsRef.current.value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const merged = Array.from(new Set([...existing, ...meta.genres])).join(", ");
        tagsRef.current.value = merged;
      }

      // fill synopsis into notes if empty
      if (meta.synopsis && notesRef.current && !notesRef.current.value.trim()) {
        notesRef.current.value = String(meta.synopsis).slice(0, 1800);
      }

      setAutofillPreview({
        releaseYear: meta.releaseYear ?? undefined,
        runtimeMinutes: meta.runtimeMinutes ?? undefined,
        synopsis: meta.synopsis ?? undefined,
        cast: meta.cast ?? [],
        posterUrl: meta.posterUrl ?? null,
      });
      toast.success("Auto-filled from TMDB/OMDb");
    } catch (error) {
      toast.error("Failed to auto-fill metadata.");
    } finally {
      setIsAutofilling(false);
    }
  };

  return (
    <form
      ref={formRef}
      action={formAction}
      className="w-full space-y-4 rounded-2xl border border-border/70 bg-card/70 p-6 shadow-card backdrop-blur-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-lg font-semibold">Add to watchlist</p>
          <p className="text-sm text-muted-foreground">
            Track anything: anime, movies, TV, YouTube, games.
          </p>
          <p className="text-xs text-muted-foreground">
            Posters, year, runtime, synopsis, and cast auto-fill when TMDB/OMDb keys are set.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onAutofill}
            disabled={isAutofilling || isPending}
            className="w-full gap-2 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            {isAutofilling ? "Auto-filling..." : "Auto-fill"}
          </Button>
          <Button type="submit" disabled={isPending} className="w-full gap-2 sm:w-auto">
            <PlusCircle className="h-4 w-4" />
            {isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/90" htmlFor="title">
            Title<span className="text-primary">*</span>
          </label>
          <div className="space-y-2">
            <div className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring">
              {lockedTitle && (
                <>
                  <input type="hidden" name="title" value={lockedTitle} />
                  <button
                    type="button"
                    className="surface-muted inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-sm font-medium capitalize transition hover:border-destructive/70 hover:text-destructive"
                    onClick={() => {
                      setLockedTitle(null);
                      setTitleValue("");
                      setSuggestionsOpen(false);
                      setSuggestions([]);
                    }}
                  >
                    {lockedTitle}
                    <span className="text-xs">x</span>
                  </button>
                </>
              )}
              {!lockedTitle && (
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Spirited Away"
                  ref={titleRef}
                  value={titleValue}
                  onChange={(e) => {
                    setTitleValue(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  autoComplete="off"
                  aria-invalid={!!fieldError("title")}
                  className="h-auto flex-1 border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0 caret-transparent"
                />
              )}
            </div>
            {suggestionsOpen && suggestions.length > 0 && !lockedTitle && (
              <div className="space-y-2 rounded-lg border border-border/60 bg-popover p-2 shadow-card">
                <div className="text-xs font-semibold text-muted-foreground">Suggestions</div>
                <div className="max-h-64 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      key={`${s.title}-${s.year ?? ""}-${s.type}`}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition hover:bg-secondary/60"
                      onClick={() => {
                        setTitleValue(s.title);
                        setTypeValue(s.type);
                        setSuggestionsOpen(false);
                        setSuggestions([]);
                        setLockedTitle(s.title);
                      }}
                    >
                      <div className="surface-inset relative h-12 w-8 overflow-hidden rounded-md border border-border/60">
                        {s.posterUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.posterUrl}
                            alt={s.title}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <span className="font-medium">
                          {s.title}
                          {s.year ? ` (${s.year})` : ""}
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {s.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {fieldError("title") && (
            <p className="text-xs text-destructive">{fieldError("title")}</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90" htmlFor="type">
              Type
            </label>
            <Select name="type" value={typeValue} onValueChange={(v) => setTypeValue(v)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("type") && (
              <p className="text-xs text-destructive">{fieldError("type")}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90" htmlFor="status">
              Status
            </label>
            <Select name="status" defaultValue="planned">
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldError("status") && (
              <p className="text-xs text-destructive">{fieldError("status")}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[180px,1fr] items-start">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90" htmlFor="rating">
              Rating (0–10)
            </label>
            <div className="flex w-full items-center gap-2 rounded-lg border border-input bg-transparent px-2 py-1">
              <Input
                id="rating"
                name="rating"
                type="number"
                inputMode="numeric"
                min={0}
                max={10}
                step={1}
              placeholder="Optional"
              aria-invalid={!!fieldError("rating")}
                className="h-8 flex-1 border-0 bg-transparent p-0 text-center text-sm shadow-none outline-none focus-visible:ring-0 no-spinner"
              value={ratingValue}
              onChange={(e) => {
                const next = e.target.value;
                if (next === "") {
                  setRatingValue("");
                    return;
                  }
                  const num = Number(next);
                  if (Number.isNaN(num)) return;
                  const clamped = Math.min(10, Math.max(0, Math.round(num)));
                  setRatingValue(String(clamped));
                }}
                onFocus={(e) => e.target.select()}
              />
              <div className="flex flex-col gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-6 w-7 text-base"
                  onClick={() => {
                    const num = Number(ratingValue || 0);
                    if (Number.isNaN(num)) return setRatingValue("0");
                    const next = Math.min(10, Math.max(0, num + 1));
                    setRatingValue(String(next));
                  }}
                >
                  +
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-6 w-7 text-base"
                  onClick={() => {
                    const num = Number(ratingValue || 0);
                    if (Number.isNaN(num)) return setRatingValue("0");
                    const next = Math.min(10, Math.max(0, num - 1));
                    setRatingValue(String(next));
                  }}
                >
                  –
                </Button>
              </div>
            </div>
            {fieldError("rating") && (
              <p className="text-xs text-destructive">{fieldError("rating")}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90" htmlFor="tags">
              Tags (comma separated)
            </label>
            <Input
              id="tags"
              name="tags"
              placeholder="studio ghibli, rewatch"
              ref={tagsRef}
              aria-invalid={!!fieldError("tags")}
            />
            {fieldError("tags") && (
              <p className="text-xs text-destructive">{fieldError("tags")}</p>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/90" htmlFor="notes">
          Notes
        </label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Why this matters, standout episodes, etc."
          ref={notesRef}
          aria-invalid={!!fieldError("notes")}
        />
        {fieldError("notes") && (
          <p className="text-xs text-destructive">{fieldError("notes")}</p>
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {autofillPreview && (
        <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Auto-fill preview
          </p>
          <div className="flex flex-wrap gap-3 text-muted-foreground">
            {autofillPreview.releaseYear && (
              <span className="surface-muted rounded-full px-3 py-1 text-xs text-foreground/90">
                Year: {autofillPreview.releaseYear}
              </span>
            )}
            {autofillPreview.runtimeMinutes && (
              <span className="surface-muted rounded-full px-3 py-1 text-xs text-foreground/90">
                Runtime: {autofillPreview.runtimeMinutes}m
              </span>
            )}
            {autofillPreview.cast?.length ? (
              <span className="surface-muted rounded-full px-3 py-1 text-xs text-foreground/90">
                Cast: {autofillPreview.cast.slice(0, 4).join(", ")}
              </span>
            ) : null}
          </div>
          {autofillPreview.synopsis && (
            <p className="mt-3 text-foreground/80">
              {autofillPreview.synopsis.slice(0, 240)}
              {autofillPreview.synopsis.length > 240 ? "…" : ""}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
