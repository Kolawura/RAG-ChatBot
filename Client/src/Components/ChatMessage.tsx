import type { ChatMessageProps } from "../utils/Types";
import { Message } from "./Message";

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 opacity-0 animate-fade-slide ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-semibold
          shrink-0 mt-0.5 font-[Syne,sans-serif]
          ${
            isUser
              ? "bg-white/6 text-white/60 border border-white/8"
              : "border border-violet-400/30 text-violet-200 text-[13px]"
          }
        `}
        style={
          isUser
            ? {
                background: "linear-gradient(135deg,#5b21b6,#7c3aed)",
                boxShadow: "0 0 16px rgba(124,58,237,.25)",
              }
            : {
                background: "linear-gradient(135deg,#4c1d95,#7c3aed)",
                boxShadow: "0 0 16px rgba(124,58,237,.25)",
              }
        }
      >
        {isUser ? "U" : "AI"}
      </div>

      {/* Bubble */}
      <div
        className={`
          max-w-[72%] px-4 py-3 text-sm leading-relaxed tracking-[0.01em]
          ${
            isUser
              ? "text-violet-50 border border-violet-400/20 text-right"
              : "text-violet-900 border border-violet-200"
          }
        `}
        style={{
          borderRadius: isUser ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
          ...(isUser
            ? { background: "linear-gradient(135deg,#5b21b6,#7c3aed)" }
            : { background: "rgba(245,243,255,0.8)" }),
        }}
      >
        <Message content={message.content} />
      </div>
    </div>
  );
};
