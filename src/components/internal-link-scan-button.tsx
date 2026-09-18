"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Network, Loader2 } from "lucide-react";

export function InternalLinkScanButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function runScan() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/internal-links`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: body?.error ?? "Scan failed." });
        return;
      }
      setMessage({
        type: "ok",
        text: `Scanned ${body.pagesScanned} pages — found ${body.opportunitiesFound} linking opportunities.`,
      });
      startTransition(() => router.refresh());
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <button
        onClick={runScan}
        disabled={loading || isPending}
        className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm font-medium text-violet-200 transition hover:bg-violet-400/20 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Network className="h-4 w-4" />}
        {loading ? "Scanning your site…" : "Scan for Internal Link Opportunities"}
      </button>
      {message ? (
        <span className={`text-xs ${message.type === "ok" ? "text-emerald-300" : "text-rose-300"}`}>
          {message.text}
        </span>
      ) : (
        <span className="text-xs text-zinc-600">Up to 2 scans per day · analyzes up to 35 pages</span>
      )}
    </div>
  );
}