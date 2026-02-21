import { useState } from "react";
import type { ChangeEvent } from "react";
import { API_BASE } from "../App";
export const IngestPanel = () => {
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleIngest = async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch(`${API_BASE}/api/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ingest failed");
      setStatus(`✅ Stored! Knowledge base size: ${data.storeSize}`);
      setText("");
    } catch (e: unknown) {
      setStatus(`❌ ${e instanceof Error ? e.message : "Failed to ingest"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-6 mt-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4">
      <p
        className="text-[11px] uppercase tracking-widest text-violet-400 mb-2"
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        Add Knowledge
      </p>
      <textarea
        className="chat-textarea w-full bg-transparent outline-none resize-none text-[#727179] text-sm leading-relaxed min-h-15 max-h-32"
        style={{ fontFamily: "'DM Mono', monospace" }}
        placeholder="Paste any text to embed into the knowledge base..."
        value={text}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
          setText(e.target.value)
        }
        disabled={loading}
      />
      <div className="flex items-center justify-between mt-2">
        {status ? (
          <span className="text-[11px] text-violet-500/70">{status}</span>
        ) : (
          <span />
        )}
        <button
          className="px-4 py-1.5 rounded-lg text-xs font-semibold text-violet-100 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-105"
          style={{
            fontFamily: "Syne, sans-serif",
            background: "linear-gradient(135deg,#5b21b6,#7c3aed)",
            boxShadow: "0 2px 10px rgba(124,58,237,.3)",
          }}
          onClick={handleIngest}
          disabled={!text.trim() || loading}
        >
          {loading ? "Ingesting..." : "Ingest"}
        </button>
      </div>
    </div>
  );
};
