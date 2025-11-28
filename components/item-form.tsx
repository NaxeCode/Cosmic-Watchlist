"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PlusCircle, Sparkles } from "lucide-react";
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

export function ItemForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [autofillPreview, setAutofillPreview] = useState<{
    releaseYear?: number;
    runtimeMinutes?: number;
    synopsis?: string;
    cast?: string[];
    posterUrl?: string | null;
  } | null>(null);
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createItemAction,
    {},
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
      setAutofillPreview(null);
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Add to watchlist</p>
          <p className="text-sm text-muted-foreground">
            Track anything: anime, movies, TV, YouTube, games.
          </p>
          <p className="text-xs text-muted-foreground">
            Posters, year, runtime, synopsis, and cast auto-fill when TMDB/OMDb keys are set.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={onAutofill} disabled={isAutofilling || isPending} className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isAutofilling ? "Auto-filling..." : "Auto-fill"}
          </Button>
          <Button type="submit" disabled={isPending} className="gap-2">
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
          <Input
            id="title"
            name="title"
            required
            placeholder="Spirited Away"
            ref={titleRef}
            aria-invalid={!!fieldError("title")}
          />
          {fieldError("title") && (
            <p className="text-xs text-destructive">{fieldError("title")}</p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/90" htmlFor="type">
              Type
            </label>
            <Select name="type" defaultValue="anime">
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
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground/90" htmlFor="rating">
            Rating (0–10)
          </label>
          <Input
            id="rating"
            name="rating"
            type="number"
            min={0}
            max={10}
            step={1}
            placeholder="Optional"
            aria-invalid={!!fieldError("rating")}
          />
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
              <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-foreground/90">
                Year: {autofillPreview.releaseYear}
              </span>
            )}
            {autofillPreview.runtimeMinutes && (
              <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-foreground/90">
                Runtime: {autofillPreview.runtimeMinutes}m
              </span>
            )}
            {autofillPreview.cast?.length ? (
              <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-foreground/90">
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
