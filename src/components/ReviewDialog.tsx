"use client";

import { useState } from "react";
import type { Evidence, ReviewResult } from "@/rules/types";
import { ChartViewer } from "./ChartViewer";

const ICON = { pass: "✓", fail: "✗", warn: "!", unknown: "?" } as const;
const STYLE = {
  pass: "bg-green-100 text-green-800",
  fail: "bg-red-100 text-red-800",
  warn: "bg-amber-100 text-amber-800",
  unknown: "bg-zinc-200 text-zinc-700",
} as const;

const SOURCE_STYLE = {
  "Paid claim": "bg-blue-100 text-blue-800",
  Chart: "bg-purple-100 text-purple-800",
  Rx: "bg-teal-100 text-teal-800",
} as const;

const BANNER = {
  complete: { text: "Regimen complete", cls: "bg-green-50 text-green-900 border-green-300" },
  complete_with_notes: {
    text: "Regimen present – items need review",
    cls: "bg-amber-50 text-amber-900 border-amber-300",
  },
  incomplete: { text: "Regimen incomplete", cls: "bg-red-50 text-red-900 border-red-300" },
} as const;

export function ReviewButton({ prescriptionId }: { prescriptionId: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    (ReviewResult & { chartFound: boolean; chartId: number | null }) | null
  >(null);
  const [viewer, setViewer] = useState<{ page: number; text: string } | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Jump to evidence: chart -> PDF viewer; claim / Rx -> scroll + flash row on the page. */
  function goTo(ev: Evidence) {
    if (ev.source === "Chart") {
      if (result?.chartId) setViewer({ page: ev.page ?? 1, text: ev.text });
      return;
    }
    const el = document.getElementById(
      ev.source === "Paid claim" && ev.claimId ? `claim-${ev.claimId}` : `rx-${prescriptionId}`,
    );
    if (!el) return;
    setMinimized(true);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("evidence-flash");
    setTimeout(() => el.classList.remove("evidence-flash"), 4000);
  }

  async function run() {
    setMinimized(false);
    setViewer(null);
    setOpen(true);
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setLoading(false);
    }
  }

  const issues = result?.items.filter((i) => i.status === "fail").length ?? 0;
  const notes = result?.items.filter((i) => i.status === "warn" || i.status === "unknown").length ?? 0;

  return (
    <>
      <button
        onClick={run}
        className="rounded-md bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
      >
        Review Regimen
      </button>
      {open && minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-800"
        >
          ← Back to checklist
        </button>
      )}
      {open && !minimized && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">{result?.title ?? "Regimen review"}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-zinc-500 hover:text-black">
                ✕
              </button>
            </div>
            {loading && <p className="text-sm text-zinc-600">Reviewing claims and chart…</p>}
            {error && <p className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {result && (
              <>
                <div className={`mb-4 rounded border p-3 text-sm font-medium ${BANNER[result.overall].cls}`}>
                  {BANNER[result.overall].text}
                  {issues > 0 && ` – ${issues} missing`}
                  {notes > 0 && ` – ${notes} to verify`}
                </div>
                {!result.chartFound && (
                  <p className="mb-3 text-sm text-red-700">No chart on file for this patient.</p>
                )}
                <ul className="space-y-2">
                  {result.items.map((item) => (
                    <li key={item.id} className="flex gap-3 rounded border border-zinc-200 p-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${STYLE[item.status]}`}
                        aria-label={item.status}
                      >
                        {ICON[item.status]}
                      </span>
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-sm text-zinc-600">{item.detail}</div>
                        {item.evidence && item.evidence.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {item.evidence.map((ev, i) => (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => goTo(ev)}
                                  title={ev.source === "Chart" ? "Open chart at this line" : "Show this row on the page"}
                                  className="flex w-full items-start gap-2 rounded bg-zinc-50 px-2 py-1 text-left text-xs hover:bg-yellow-50 hover:ring-1 hover:ring-amber-400"
                                >
                                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-semibold ${SOURCE_STYLE[ev.source]}`}>
                                    {ev.source}
                                    {ev.source === "Chart" && ev.page ? ` p.${ev.page}` : ""}
                                  </span>
                                  <span className="font-mono text-zinc-800">{ev.text}</span>
                                  <span className="ml-auto shrink-0 text-blue-700">View ↗</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-zinc-500">
                  Decision support only – pharmacist judgment required. Synthetic data.
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {viewer && result?.chartId && (
        <ChartViewer
          chartId={result.chartId}
          page={viewer.page}
          highlight={viewer.text}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
}
