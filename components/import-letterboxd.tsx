"use client";

import { useActionState, useEffect } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { importLetterboxdAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ActionState = {
  success?: string;
  error?: string;
};

export function ImportLetterboxd() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    importLetterboxdAction,
    {},
  );

  useEffect(() => {
    if (state?.success) toast.success(state.success);
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form
      action={formAction}
      className="w-full space-y-4 rounded-2xl border border-border/70 bg-secondary/40 p-6 shadow-card backdrop-blur-lg"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-lg font-semibold">Import from Letterboxd</p>
          <p className="text-sm text-muted-foreground">
            Upload your Letterboxd CSV export. We&apos;ll import up to 300 movies as completed/planned with ratings and tags.
          </p>
        </div>
        <Button type="submit" disabled={pending} className="gap-2">
          <Upload className="h-4 w-4" />
          {pending ? "Importing..." : "Import"}
        </Button>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground/90" htmlFor="letterboxd-file">
          CSV file
        </label>
        <input
          id="letterboxd-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full cursor-pointer rounded-lg border border-border/60 bg-transparent px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground"
        />
        <Alert variant="info">
          <AlertTitle>Letterboxd export</AlertTitle>
          <AlertDescription className="text-sm text-[#c8b5ff] drop-shadow-[0_0_10px_rgba(200,181,255,0.75)]">
            Settings → Import & Export → Export your data → upload CSV. Semicolons and commas are supported.
          </AlertDescription>
        </Alert>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
