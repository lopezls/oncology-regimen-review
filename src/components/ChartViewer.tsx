"use client";

import { useEffect, useRef, useState } from "react";

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Renders one page of the chart PDF and highlights the line(s) the rules
 * engine pulled its evidence from, then scrolls to the first highlight.
 */
export function ChartViewer({
  chartId,
  page,
  highlight,
  onClose,
}: {
  chartId: number;
  page: number;
  highlight: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjs.getDocument({ url: `/api/charts/${chartId}` }).promise;
        const pg = await doc.getPage(Math.min(Math.max(page, 1), doc.numPages));
        const viewport = pg.getViewport({ scale: 1.4 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pg.render({ canvas, viewport }).promise;

        const target = norm(highlight);
        const content = await pg.getTextContent();
        const found: Box[] = [];
        for (const item of content.items) {
          if (!("str" in item)) continue;
          const str = norm(item.str);
          if (str.length < 3) continue;
          if (target.includes(str) || str.includes(target)) {
            const t = pdfjs.Util.transform(viewport.transform, item.transform);
            const height = Math.hypot(t[2], t[3]);
            found.push({
              left: t[4] - 2,
              top: t[5] - height * 0.85,
              width: item.width * viewport.scale + 4,
              height: height * 1.1,
            });
          }
        }
        if (cancelled) return;
        setSize({ w: viewport.width, h: viewport.height });
        setBoxes(found);
        if (found[0] && scrollRef.current) {
          scrollRef.current.scrollTo({
            top: Math.max(found[0].top - 120, 0),
            behavior: "smooth",
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not render chart");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chartId, page, highlight]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm">
            <span className="font-semibold">Submitted chart</span> · page {page}
            {size && boxes.length === 0 && (
              <span className="ml-2 text-amber-700">(exact text not located on page)</span>
            )}
          </div>
          <button onClick={onClose} className="rounded border px-2 py-1 text-sm hover:bg-zinc-100">
            ← Back to checklist
          </button>
        </div>
        <div ref={scrollRef} className="overflow-auto bg-zinc-200 p-3">
          {error && <p className="rounded bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {!size && !error && <p className="p-3 text-sm text-zinc-600">Loading chart…</p>}
          <div className="relative mx-auto" style={size ? { width: size.w, height: size.h } : undefined}>
            <canvas ref={canvasRef} className="block bg-white shadow" />
            {boxes.map((b, i) => (
              <div
                key={i}
                className="pointer-events-none absolute animate-pulse rounded-sm border-2 border-amber-500 bg-yellow-300/50"
                style={{ left: b.left, top: b.top, width: b.width, height: b.height }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
