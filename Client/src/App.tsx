import { useState, useRef, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { IngestPanel } from "./Components/IngestPanel";
import { ChatMessage } from "./Components/ChatMessage";
import { TypingIndicator } from "./Components/TypingIndicator";
import type { Message, GeminiRAGResponse } from "./utils/Types";
import { API_BASE } from "./utils/config";

console.log(API_BASE);

export default function AIChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [showIngest, setShowIngest] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const autoResize = (): void => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const sendMessage = async (): Promise<void> => {
    const text = input.trim();
    if (!text || loading) return;

    setError("");
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data: GeminiRAGResponse = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "API error");

      const reply = data.answer ?? "(no response)";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setInput(e.target.value);
    autoResize();
  };

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,80,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(120,80,255,.06) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Background glow */}
      <div
        className="fixed pointer-events-none z-0 w-150 h-150 -top-25 left-1/2 -translate-x-1/2"
        style={{
          background:
            "radial-gradient(circle,rgba(100,60,240,.12) 0%,transparent 70%)",
        }}
      />

      {/* App shell */}
      <div
        className="relative z-10 flex flex-col h-screen mx-auto"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {/* ── Header ── */}
        <header className="relative z-10 flex items-center gap-3.5 px-7 pt-5 pb-4 border-b border-violet-200/30 backdrop-blur-xl">
          <div
            className="animate-logo-pulse w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0"
            style={{
              boxShadow: "0 0 12px #7c3aed,0 0 24px rgba(124,58,237,.4)",
            }}
          />
          <span
            className="text-[17px] font-bold tracking-wide text-"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            RAG Chat
          </span>
          <span className="text-[11px] uppercase tracking-widest text-violet-600/40 ml-1">
            Gemini 2.5 Flash
          </span>

          {/* Toggle ingest panel */}
          <button
            onClick={() => setShowIngest((v) => !v)}
            className="ml-auto text-[11px] uppercase tracking-widest px-3 py-1 rounded-lg border transition-all duration-150"
            style={{
              fontFamily: "Syne, sans-serif",
              borderColor: showIngest
                ? "rgba(124,58,237,.6)"
                : "rgba(255,255,255,.08)",
              color: showIngest ? "#a78bfa" : "rgba(124,58,237,.6)",
              background: showIngest ? "rgba(124,58,237,.1)" : "transparent",
            }}
          >
            <span className="text-[14px]">+</span> Knowledge
          </button>
        </header>

        {/* ── Ingest Panel (collapsible) ── */}
        {showIngest && <IngestPanel />}

        {/* ── Messages ── */}
        <div className="messages-scroll flex-1 overflow-y-auto flex flex-col gap-5 px-6 py-7 relative z-5">
          {messages.length === 0 && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-50 py-16">
              <span
                className="text-[52px] font-extrabold tracking-tight"
                style={{
                  fontFamily: "Syne, sans-serif",
                  background: "linear-gradient(135deg,#7c3aed,#a78bfa,#c4b5fd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                RAG
              </span>
              <p className="text-[13px] text-violet-500/80 tracking-[0.05em]">
                Add knowledge above, then ask anything
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage key={i} message={msg} />
          ))}

          {loading && (
            <div className="flex gap-3 opacity-0 animate-fade-slide">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-semibold shrink-0 mt-0.5 border border-violet-400/30 text-violet-200"
                style={{
                  fontFamily: "Syne, sans-serif",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)",
                  boxShadow: "0 0 16px rgba(124,58,237,.25)",
                }}
              >
                AI
              </div>
              <div
                className="px-4 py-3 bg-white/4 border border-white/[0.07]"
                style={{ borderRadius: "4px 14px 14px 14px" }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input area ── */}
        <div
          className="relative z-10 px-32 pt-4 pb-6 border-t backdrop-blur-xl"
          style={{
            borderColor: "rgba(124,58,237,.15)",
          }}
        >
          {error && (
            <div className="mb-2.5 px-4 py-2 text-xs text-red-400 text-center rounded-lg border border-red-400/20 bg-red-400/8">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2.5 px-4 py-2.5 pr-3 rounded-[14px] bg-white/4 border border-black/10 transition-all duration-200 focus-within:border-violet-600/50 shadow-lg">
            <textarea
              ref={textareaRef}
              className="chat-textarea flex-1 bg-transparent border-none outline-none resize-none text-gray-900/80 text-sm leading-relaxed tracking-[0.01em] min-h-6 max-h-40"
              style={{ fontFamily: "'DM Mono', monospace" }}
              value={input}
              onChange={handleChange}
              onKeyDown={handleKey}
              placeholder="Ask a question about your knowledge base..."
              rows={1}
              disabled={loading}
            />

            <button
              className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 text-violet-50 border-none cursor-pointer transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:scale-105"
              style={{
                background: "linear-gradient(135deg,#5b21b6,#7c3aed)",
                boxShadow: "0 2px 12px rgba(124,58,237,.35)",
              }}
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          <p className="mt-2.5 text-center text-[11px] tracking-[0.05em] text-violet-100/30">
            Powered by Gemini AI· Press Enter to send
          </p>
        </div>
      </div>
    </>
  );
}
