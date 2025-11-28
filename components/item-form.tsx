"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
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
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createItemAction,
    {},
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = (name: string) => state?.fieldErrors?.[name]?.[0];

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
        </div>
        <Button type="submit" disabled={isPending} className="gap-2">
          <PlusCircle className="h-4 w-4" />
          {isPending ? "Adding..." : "Add"}
        </Button>
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
          aria-invalid={!!fieldError("notes")}
        />
        {fieldError("notes") && (
          <p className="text-xs text-destructive">{fieldError("notes")}</p>
        )}
      </div>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  );
}
