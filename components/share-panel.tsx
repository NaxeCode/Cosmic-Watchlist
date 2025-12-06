"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Link2, RefreshCw, ShieldX, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  disableSharingAction,
  enableSharingAction,
  regenerateShareHandleAction,
} from "@/app/actions";

type Props = {
  initialHandle: string | null;
  initialEnabled: boolean;
};

export function SharePanel({ initialHandle, initialEnabled }: Props) {
  const [handle, setHandle] = useState<string | null>(initialHandle);
  const [enabled, setEnabled] = useState<boolean>(initialEnabled);
  const [pending, startTransition] = useTransition();
  const [shareUrl, setShareUrl] = useState<string>("");

  useEffect(() => {
    if (handle) {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${origin}/share/${handle}`);
    } else {
      setShareUrl("");
    }
  }, [handle]);

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(
      () => toast.success("Link copied"),
      () => toast.error("Could not copy link"),
    );
  };

  const enable = () => {
    startTransition(async () => {
      const res = await enableSharingAction();
      if (res?.success) {
        setHandle(res.handle ?? handle);
        setEnabled(true);
        toast.success(res.success);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  const disable = () => {
    startTransition(async () => {
      const res = await disableSharingAction();
      if (res?.success) {
        setEnabled(false);
        toast.success(res.success);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  const regenerate = () => {
    startTransition(async () => {
      const res = await regenerateShareHandleAction();
      if (res?.success) {
        setHandle(res.handle ?? handle);
        setEnabled(true);
        toast.success(res.success);
      } else if (res?.error) {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/50 p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Sharing</p>
          <p className="text-xs text-muted-foreground">Share a public view of your watchlist.</p>
        </div>
        <div className="flex items-center gap-2">
          {enabled ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Enabled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-300">
              <ShieldX className="h-3.5 w-3.5" />
              Disabled
            </span>
          )}
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="surface-muted flex items-center gap-2 rounded-xl border border-border/70 px-3 py-2">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          <input
            value={shareUrl}
            readOnly
            placeholder="Enable sharing to get a link"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!handle || !enabled || pending}
            onClick={copyLink}
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={regenerate}
          >
            <RefreshCw className="h-4 w-4" />
            New link
          </Button>
          {enabled ? (
            <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={disable}>
              Disable
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={pending} onClick={enable}>
              Enable
            </Button>
          )}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Anyone with the link can view your watchlist. You can regenerate to invalidate old links or disable sharing anytime.
      </p>
    </div>
  );
}
