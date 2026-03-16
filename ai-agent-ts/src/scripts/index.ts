import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { indexKnowledgeToPinecone } from "../agent/rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const envPath = path.resolve(projectRoot, "../.env");
dotenv.config({ path: envPath });

async function main(): Promise<void> {
  const missing: string[] = [];
  if (!process.env.PINECONE_API_KEY) missing.push("PINECONE_API_KEY");
  if (!process.env.PINECONE_INDEX) missing.push("PINECONE_INDEX");
  if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  try {
    await indexKnowledgeToPinecone();
    console.log("Knowledge indexed to Pinecone successfully.");
  } catch (err) {
    console.error("Failed to index knowledge:", err);
    process.exit(1);
  }
}

main();
