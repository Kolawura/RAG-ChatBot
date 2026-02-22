export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AskRequestBody {
  question: string;
  history?: ChatMessage[];
}

export interface VectorDocument {
  text: string;
  embedding: number[];
}
