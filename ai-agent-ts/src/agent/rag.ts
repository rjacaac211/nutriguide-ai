import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTION_NAME = "nutrition_knowledge";
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8001";

function getKnowledgeDir(): string {
  // Resolve from dist/ or src/ to project root, then knowledge/
  const projectRoot = path.resolve(__dirname, "../..");
  return path.join(projectRoot, "knowledge");
}

function getNutritionDocuments(): Document[] {
  const knowledgeDir = getKnowledgeDir();
  const docs: Document[] = [];

  if (!fs.existsSync(knowledgeDir)) {
    return docs;
  }

  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".txt"));
  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    docs.push({
      pageContent: content,
      metadata: { source: file },
    });
  }
  return docs;
}

async function ensureIndexed(vectorStore: Chroma): Promise<void> {
  const docs = getNutritionDocuments();
  if (docs.length === 0) return;

  const ids = docs.map((d) => {
    const src = d.metadata?.source as string;
    return src ? src.replace(/\.txt$/, "") : `doc-${Math.random()}`;
  });
  await vectorStore.addDocuments(docs, { ids });
}

let _retriever: ReturnType<Chroma["asRetriever"]> | null = null;

export async function getRetriever() {
  if (_retriever) return _retriever;

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  const vectorStore = new Chroma(embeddings, {
    collectionName: COLLECTION_NAME,
    url: CHROMA_URL,
  });

  await ensureIndexed(vectorStore);
  _retriever = vectorStore.asRetriever({ k: 4 });
  return _retriever;
}

export async function searchNutritionKnowledge(query: string): Promise<string> {
  const retriever = await getRetriever();
  const docs = await retriever.invoke(query);
  if (!docs || docs.length === 0) {
    return "No specific nutrition information found for this query. Use general nutrition knowledge.";
  }
  return docs.map((d) => d.pageContent).join("\n\n");
}
