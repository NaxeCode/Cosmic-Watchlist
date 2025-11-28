"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { aiCategorizeAction } from "@/app/actions";

export function AiCategorizeButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [ranOnce, setRanOnce] = useState(false);

  const run = () => {
    startTransition(async () => {
      const res = await aiCategorizeAction();
      if (res?.success) {
        setRanOnce(true);
        toast.success(res.success);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant={ranOnce ? "secondary" : "default"}
      size="sm"
      className="gap-2"
      onClick={run}
      disabled={pending || disabled}
    >
      <Sparkles className="h-4 w-4" />
      {pending ? "Tagging..." : "AI categorize"}
    </Button>
  );
}
