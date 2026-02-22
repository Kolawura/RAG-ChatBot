import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AskRequestBody, VectorDocument } from "./Type";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://rag-chat-bot-peach.vercel.app/"],
  }),
);

// Ensure the API key exists
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in environment variables.");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});
const chatModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// 1. TYPES & IN-MEMORY VECTOR STORE

let vectorStore: VectorDocument[] = [];

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 2. INGESTION ENDPOINT (Add Data)

app.post("/api/ingest", async (req: Request, res: Response): Promise<any> => {
  try {
    const { text } = req.body as { text: string };

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding.values;

    const newDocument: VectorDocument = { text, embedding };
    vectorStore.push(newDocument);

    return res.json({
      message: "Text successfully embedded and stored!",
      storeSize: vectorStore.length,
    });
  } catch (error) {
    console.error("Ingestion Error:", error);
    return res.status(500).json({ error: "Failed to process text" });
  }
});

// 3. RETRIEVAL & GENERATION ENDPOINT (RAG)

app.post("/api/ask", async (req: Request, res: Response): Promise<any> => {
  try {
    const { question, history = [] } = req.body as AskRequestBody;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const queryResult = await embeddingModel.embedContent(question);
    const queryEmbedding = queryResult.embedding.values;

    const rankedResults = vectorStore.map((doc) => {
      return {
        text: doc.text,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
      };
    });

    rankedResults.sort((a, b) => b.score - a.score);
    const topResults = rankedResults.slice(0, 3);

    const context = topResults.map((doc) => doc.text).join("\n\n---\n\n");

    const chatHistory =
      history.length > 0
        ? history
            .slice(-10)
            .map(
              (m) =>
                `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`,
            )
            .join("\n")
        : "No previous conversation.";

    const prompt = `
    You are an expert assistant with access to a knowledge base. Answer every question as helpfully as possible.

    KNOWLEDGE BASE CONTEXT:
    ${context || "No relevant context found."}

    CONVERSATION HISTORY:
    ${chatHistory}

    CURRENT QUESTION:
    ${question}

    INSTRUCTIONS:
    - Use the conversation history to understand follow-up questions
    - If the context contains the answer, respond directly and confidently using it
    - If the context is partially relevant, use what's there and supplement with your general knowledge — clearly separate the two
    - If the context has nothing relevant, answer from your own knowledge but start your response with: "⚠️ This isn't in my knowledge base, but from general knowledge:"
    - Be concise — no filler phrases like "Based on the context provided..."
    - Preserve technical terms, names, and numbers exactly as they appear
    - Use bullet points or numbered lists when listing multiple things
    - Never pretend context exists when it doesn't

    ANSWER:
    `;

    const response = await chatModel.generateContent(prompt);
    const answer = response.response.text();

    return res.json({
      answer,
      retrievedContext: topResults,
    });
  } catch (error) {
    console.error("RAG Error:", error);
    return res.status(500).json({ error: "Failed to generate answer" });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
