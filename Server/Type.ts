export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  system?: string;
}

export interface VectorDocument {
  text: string;
  embedding: number[];
}
