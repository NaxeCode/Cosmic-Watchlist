"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUSES, ITEM_TYPES } from "@/lib/constants";

const suggestions = [
  { label: "New planned anime", type: "anime", status: "planned" },
  { label: "Mark something as completed", status: "completed" },
  { label: "Jump to games lane", type: "game" },
];

export function CommandPalette({ withTrigger = false }: { withTrigger?: boolean }) {
  const [open, setOpen] = useState(false);

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
        <CommandInput placeholder="Quick search or jump (placeholder for future shortcuts)" />
        <CommandList>
          <CommandEmpty>No matching shortcuts yet.</CommandEmpty>
          <CommandGroup heading="Suggested actions">
            {suggestions.map((item) => (
              <CommandItem key={item.label} value={item.label}>
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.type && (
                    <Badge variant="outline">{item.type}</Badge>
                  )}
                  {item.status && (
                    <Badge variant="outline">{item.status}</Badge>
                  )}
                </span>
                <CommandShortcut>Coming soon</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Types">
            {ITEM_TYPES.map((type) => (
              <CommandItem key={type} value={type}>
                {type}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Statuses">
            {STATUSES.map((status) => (
              <CommandItem key={status} value={status}>
                {status}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
