type Role = "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface RetrievedContext {
  text: string;
  score: number;
}

export interface GeminiRAGResponse {
  answer?: string;
  retrievedContext?: RetrievedContext[];
  error?: string;
}

export interface ChatMessageProps {
  message: Message;
}
