"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { updateItemAction } from "@/app/actions";
import { ITEM_TYPES, STATUSES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { items } from "@/db/schema";

type Item = typeof items.$inferSelect;

type ActionState = {
  success?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function EditItemDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateItemAction,
    {},
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const fieldError = (name: string) => state?.fieldErrors?.[name]?.[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit item</DialogTitle>
          <DialogDescription>Update the metadata and save changes.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={item.id} />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`title-${item.id}`}>
              Title
            </label>
            <Input
              id={`title-${item.id}`}
              name="title"
              defaultValue={item.title}
              aria-invalid={!!fieldError("title")}
            />
            {fieldError("title") && (
              <p className="text-xs text-destructive">{fieldError("title")}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`type-${item.id}`}>
                Type
              </label>
              <Select name="type" defaultValue={item.type}>
                <SelectTrigger id={`type-${item.id}`}>
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
              <label className="text-sm font-medium" htmlFor={`status-${item.id}`}>
                Status
              </label>
              <Select name="status" defaultValue={item.status}>
                <SelectTrigger id={`status-${item.id}`}>
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`rating-${item.id}`}>
                Rating (0–10)
              </label>
              <Input
                id={`rating-${item.id}`}
                name="rating"
                type="number"
                min={0}
                max={10}
                defaultValue={item.rating ?? ""}
              />
              {fieldError("rating") && (
                <p className="text-xs text-destructive">{fieldError("rating")}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={`tags-${item.id}`}>
                Tags
              </label>
              <Input
                id={`tags-${item.id}`}
                name="tags"
                defaultValue={item.tags ?? ""}
              />
              {fieldError("tags") && (
                <p className="text-xs text-destructive">{fieldError("tags")}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={`notes-${item.id}`}>
              Notes
            </label>
            <Textarea
              id={`notes-${item.id}`}
              name="notes"
              defaultValue={item.notes ?? ""}
            />
            {fieldError("notes") && (
              <p className="text-xs text-destructive">{fieldError("notes")}</p>
            )}
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
