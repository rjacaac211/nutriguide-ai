import dotenv from "dotenv";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MarkdownTextSplitter } from "@langchain/textsplitters";
import { Pinecone } from "@pinecone-database/pinecone";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (ai-agent-ts/../.env) so RAG works when imported from any entry point
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const PINECONE_INDEX = process.env.PINECONE_INDEX;

/** Source URLs for knowledge files. Add entries when adding new .md files. */
const KNOWN_SOURCES: Record<string, string> = {
  "healthy_diet.md":
    "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
};

function getKnowledgeDir(): string {
  const projectRoot = path.resolve(__dirname, "../..");
  return path.join(projectRoot, "knowledge");
}

const textSplitter = new MarkdownTextSplitter({
  chunkSize: 1500,
  chunkOverlap: 200,
});

function getNutritionDocuments(): Document[] {
  const knowledgeDir = getKnowledgeDir();
  const docs: Document[] = [];

  if (!fs.existsSync(knowledgeDir)) {
    return docs;
  }

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    docs.push({
      pageContent: content,
      metadata: {
        source: file,
        url: KNOWN_SOURCES[file] ?? "",
      },
    });
  }
  return docs;
}

async function ensureIndexed(vectorStore: PineconeStore): Promise<void> {
  const docs = getNutritionDocuments();
  if (docs.length === 0) return;

  const allChunks: Document[] = [];
  const allIds: string[] = [];

  for (const doc of docs) {
    const chunks = await textSplitter.splitDocuments([doc]);
    const src = doc.metadata?.source as string;
    const baseId = src ? src.replace(/\.md$/, "") : `doc-${Math.random()}`;
    for (let i = 0; i < chunks.length; i++) {
      allChunks.push(chunks[i]);
      allIds.push(`${baseId}-${i}`);
    }
  }

  if (allChunks.length > 0) {
    await vectorStore.addDocuments(allChunks, { ids: allIds });
  }
}

let _retriever: ReturnType<PineconeStore["asRetriever"]> | null = null;

export async function getRetriever() {
  if (_retriever) return _retriever;

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  if (!PINECONE_INDEX) {
    throw new Error(
      "PINECONE_INDEX environment variable is required for RAG. Add it to your .env file in the project root (e.g. PINECONE_INDEX=nutriguide-app-knowledge). See .env.example."
    );
  }
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(PINECONE_INDEX);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
  });

  _retriever = vectorStore.asRetriever({ k: 4 });
  return _retriever;
}

/** Index knowledge files to Pinecone. Call from CI or manually when knowledge changes. */
export async function indexKnowledgeToPinecone(): Promise<void> {
  if (!process.env.PINECONE_INDEX) {
    throw new Error(
      "PINECONE_INDEX environment variable is required. Add it to your .env file (e.g. PINECONE_INDEX=nutriguide-app-knowledge)."
    );
  }
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX);
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
  });
  await ensureIndexed(vectorStore);
}

export async function searchNutritionKnowledge(query: string): Promise<string> {
  const retriever = await getRetriever();
  const docs = await retriever.invoke(query);
  if (!docs || docs.length === 0) {
    return "No specific nutrition information found for this query. Use general nutrition knowledge.";
  }
  const content = docs.map((d) => d.pageContent).join("\n\n");
  const urls = [
    ...new Set(
      docs
        .map((d) => d.metadata?.url as string | undefined)
        .filter((u): u is string => Boolean(u))
    ),
  ];
  if (urls.length > 0) {
    return `${content}\n\n**Sources:**\n${urls.map((u) => `- ${u}`).join("\n")}`;
  }
  return content;
}
