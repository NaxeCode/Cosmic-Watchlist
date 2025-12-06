"use client";

import type React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type SubmitEvent = React.FormEvent<HTMLFormElement>;

export function FeedbackPanel() {
  const feedbackRef = useRef<HTMLFormElement>(null);
  const bugRef = useRef<HTMLFormElement>(null);
  const [url, setUrl] = useState("");
  const [isSendingFeedback, startSendFeedback] = useTransition();
  const [isSendingBug, startSendBug] = useTransition();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(window.location.href);
    }
  }, []);

  const submitFeedback = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      message: (data.get("message") as string) || "",
      area: (data.get("area") as string) || "general",
      sentiment: (data.get("sentiment") as string) || undefined,
      email: (data.get("email") as string) || undefined,
    };

    startSendFeedback(async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Could not send feedback.");
        return;
      }
      toast.success("Thanks for the feedback!");
      form.reset();
    });
  };

  const submitBug = (event: SubmitEvent) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      summary: (data.get("summary") as string) || "",
      steps: (data.get("steps") as string) || "",
      expected: (data.get("expected") as string) || "",
      actual: (data.get("actual") as string) || "",
      severity: (data.get("severity") as string) || "minor",
      frequency: (data.get("frequency") as string) || "sometimes",
      email: (data.get("email") as string) || undefined,
      url: (data.get("url") as string) || undefined,
    };

    startSendBug(async () => {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Could not submit bug report.");
        return;
      }
      toast.success("Bug report sent. Thank you!");
      form.reset();
    });
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="glow" className="text-xs uppercase tracking-[0.18em]">
          Feedback loop
        </Badge>
        <p className="text-sm text-muted-foreground">
          Tell us what works, what’s rough, or when something breaks.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-secondary/40 p-4 shadow-card">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Share feedback</h3>
            <p className="text-sm text-muted-foreground">
              Quick thoughts, requests, or praise. Max ~1000 characters.
            </p>
          </div>
          <form ref={feedbackRef} onSubmit={submitFeedback} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                Area
                <select
                  name="area"
                  className="surface-inset mt-1 w-full rounded-md border border-border/60 px-3 py-2 text-sm text-foreground shadow-inner"
                  defaultValue="general"
                >
                  <option value="general">General</option>
                  <option value="ui">UI/UX</option>
                  <option value="performance">Performance</option>
                  <option value="data">Data accuracy</option>
                  <option value="auth">Auth/sharing</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="text-sm text-muted-foreground">
                Sentiment
                <select
                  name="sentiment"
                  className="surface-inset mt-1 w-full rounded-md border border-border/60 px-3 py-2 text-sm text-foreground shadow-inner"
                  defaultValue=""
                >
                  <option value="">Neutral</option>
                  <option value="up">👍 Positive</option>
                  <option value="down">👎 Needs work</option>
                </select>
              </label>
            </div>
            <Textarea
              name="message"
              placeholder="Tell us one thing to improve or keep doing..."
              required
              maxLength={1000}
            />
            <Input name="email" type="email" placeholder="Email (optional)" />
            <Button type="submit" disabled={isSendingFeedback} className="w-full sm:w-auto">
              {isSendingFeedback ? "Sending..." : "Send feedback"}
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-secondary/40 p-4 shadow-card">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Report a bug</h3>
            <p className="text-sm text-muted-foreground">
              Include steps, expected vs. actual, and how often it happens.
            </p>
          </div>
          <form ref={bugRef} onSubmit={submitBug} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                Severity
                <select
                  name="severity"
                  className="surface-inset mt-1 w-full rounded-md border border-border/60 px-3 py-2 text-sm text-foreground shadow-inner"
                  defaultValue="minor"
                >
                  <option value="blocker">Blocker</option>
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                </select>
              </label>
              <label className="text-sm text-muted-foreground">
                Frequency
                <select
                  name="frequency"
                  className="surface-inset mt-1 w-full rounded-md border border-border/60 px-3 py-2 text-sm text-foreground shadow-inner"
                  defaultValue="sometimes"
                >
                  <option value="always">Always</option>
                  <option value="sometimes">Sometimes</option>
                  <option value="rarely">Rarely</option>
                </select>
              </label>
            </div>
            <Input name="summary" placeholder="Short summary" required maxLength={120} />
            <Textarea
              name="steps"
              placeholder="Steps to reproduce, one per line"
              required
              maxLength={2000}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Textarea
                name="expected"
                placeholder="Expected result"
                required
                maxLength={600}
                className="min-h-[90px]"
              />
              <Textarea
                name="actual"
                placeholder="Actual result"
                required
                maxLength={600}
                className="min-h-[90px]"
              />
            </div>
            <Input name="url" placeholder="Page URL" defaultValue={url} />
            <Input name="email" type="email" placeholder="Email (optional)" />
            <Button type="submit" disabled={isSendingBug} className="w-full sm:w-auto">
              {isSendingBug ? "Sending..." : "Send bug report"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
