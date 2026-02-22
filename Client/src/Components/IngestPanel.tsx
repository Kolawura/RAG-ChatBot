import { useState, useRef } from "react";
import type { ChangeEvent, DragEvent } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { API_BASE } from "../utils/config";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const chunkText = (text: string, chunkSize = 500): string[] => {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText.trim();
};

const readTextFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });

export const IngestPanel = () => {
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File): Promise<void> => {
    setStatus(`📄 Reading ${file.name}...`);
    try {
      let extracted = "";

      if (file.type === "application/pdf") {
        extracted = await extractTextFromPDF(file);
      } else {
        extracted = await readTextFile(file);
      }

      setText(extracted);
      setStatus(
        `✅ "${file.name}" loaded — ${extracted.length.toLocaleString()} characters. Click Ingest to embed.`,
      );
    } catch (e: unknown) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Failed to read file"}`);
    }
  };

  const handleFileInput = async (
    e: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = "";
  };

  // ── Drag & drop ──────────────────────────────────────────────────────────

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => setIsDragging(false);

  const handleDrop = async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  // ── Ingest ───────────────────────────────────────────────────────────────

  const handleIngest = async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setStatus("");
    setProgress(null);

    const chunks = chunkText(trimmed);
    setProgress({ current: 0, total: chunks.length });

    let failed = 0;

    try {
      const BATCH_SIZE = 10;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
          batch.map((chunk) =>
            fetch(`${API_BASE}/api/ingest`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: chunk }),
            }),
          ),
        );

        failed += results.filter((r) => r.status === "rejected").length;
        setProgress({
          current: Math.min(i + BATCH_SIZE, chunks.length),
          total: chunks.length,
        });
      }

      setText("");
      setStatus(
        failed === 0
          ? `✅ Ingested ${chunks.length} chunk${chunks.length > 1 ? "s" : ""} successfully!`
          : `⚠️ Ingested ${chunks.length - failed}/${chunks.length} chunks (${failed} failed)`,
      );
    } catch (e: unknown) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Ingest failed"}`);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-6 mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      {/* Header */}
      <p
        className="text-[11px] uppercase tracking-widest text-violet-400 mb-3"
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        Add Knowledge
      </p>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          flex flex-col items-center justify-center gap-1.5 py-4 mb-3
          rounded-lg border-2 border-dashed cursor-pointer transition-all duration-150
          ${
            isDragging
              ? "border-violet-400 bg-violet-100/60"
              : "border-violet-200 hover:border-violet-300 hover:bg-violet-50"
          }
        `}
      >
        <span className="text-xl">📎</span>
        <p
          className="text-[12px] text-violet-400"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Drop a file or <span className="underline">browse</span>
        </p>
        <p className="text-[10px] text-violet-300/70 uppercase tracking-widest">
          .txt · .md · .csv · .pdf
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.pdf"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Textarea */}
      <textarea
        className="chat-textarea w-full bg-white/60 outline-none resize-none text-violet-900 text-sm leading-relaxed min-h-[72px] max-h-40 rounded-lg px-3 py-2 border border-violet-200 focus:border-violet-400 transition-colors"
        style={{ fontFamily: "'DM Mono', monospace" }}
        placeholder="...or paste text directly here"
        value={text}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        disabled={loading}
      />

      {/* Progress bar */}
      {progress && (
        <div className="mt-2">
          <div className="w-full bg-violet-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
                background: "linear-gradient(90deg,#5b21b6,#7c3aed)",
              }}
            />
          </div>
          <p
            className="text-[10px] text-violet-400 mt-1 text-right"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            {progress.current} / {progress.total} chunks
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {status ? (
          <span className="text-[11px] text-violet-500/70 max-w-[70%]">
            {status}
          </span>
        ) : (
          <span />
        )}
        <button
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-105 shrink-0"
          style={{
            fontFamily: "Syne, sans-serif",
            background: "linear-gradient(135deg,#5b21b6,#7c3aed)",
            boxShadow: "0 2px 10px rgba(124,58,237,.3)",
          }}
          onClick={handleIngest}
          disabled={!text.trim() || loading}
        >
          {loading ? `Ingesting...` : "Ingest"}
        </button>
      </div>
    </div>
  );
};
