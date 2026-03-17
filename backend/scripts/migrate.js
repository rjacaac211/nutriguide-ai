import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = process.argv.slice(2).join(" ");
execSync(`npx prisma migrate ${args || "dev"}`, { stdio: "inherit" });
