"use client";

import * as React from "react";
import { RefreshCw, Zap, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";

interface JobDef {
  key: string;
  label: string;
  description: string;
}

export function JobsAdmin() {
  const [jobs, setJobs] = React.useState<JobDef[] | null>(null);
  const [configured, setConfigured] = React.useState(false);
  const [triggering, setTriggering] = React.useState<string | null>(null);

  const fetchJobs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/jobs", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setJobs(json.data.jobs);
        setConfigured(json.data.configured);
      }
    } catch {
      // ignored
    }
  }, []);

  React.useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  const trigger = async (job: string) => {
    setTriggering(job);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "Could not enqueue job");
        return;
      }
      toast.success(`Job "${job}" enqueued`);
    } catch {
      toast.error("Network error");
    } finally {
      setTriggering(null);
    }
  };

  if (!jobs) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Background Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Scheduled tasks powered by QStash (review requests, reminders, alerts).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void fetchJobs()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" /> QStash status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {configured ? (
            <Badge variant="success">Configured — jobs will run automatically</Badge>
          ) : (
            <p className="text-sm text-muted-foreground">
              QStash is not configured. Add <span className="font-mono text-xs">QSTASH_TOKEN</span>,
              <span className="font-mono text-xs"> QSTASH_CURRENT_SIGNING_KEY</span> and{" "}
              <span className="font-mono text-xs">QSTASH_NEXT_SIGNING_KEY</span> to the environment,
              then create a scheduled HTTP call to{" "}
              <span className="font-mono text-xs">/api/jobs/sweep</span> (e.g. every 15 minutes) in
              the QStash console.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {jobs.map((job) => (
          <Card key={job.key}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="font-medium">{job.label}</p>
                <p className="text-xs text-muted-foreground">{job.description}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{job.key}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={triggering === job.key || !configured}
                onClick={() => void trigger(job.key)}
              >
                <Zap className="h-3.5 w-3.5" /> Test now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}