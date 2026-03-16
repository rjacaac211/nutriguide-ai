# NutriGuide AI - Experimentation Notebooks

Python Jupyter notebooks for experimenting with the AI agent, RAG, prompts, and tools. The production agent runs in TypeScript ([ai-agent-ts](../ai-agent-ts)); these notebooks let you explore ideas in Python before porting them.

## Prerequisites

- Python 3.10+
- Project `.env` at repo root with `OPENAI_API_KEY` set (copy from [.env.example](../.env.example))

## Setup

1. Create and activate a virtual environment (or use the project root `.venv`):

   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   # source .venv/bin/activate   # macOS/Linux
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Ensure `.env` exists at the project root (`../.env`). Notebooks load it via `load_dotenv("../.env")`.

## Running Notebooks

```bash
jupyter notebook
# or
jupyter lab
```

Open any `.ipynb` file and run the cells. The first notebook (`01-agent-basics.ipynb`) verifies the stack and runs a simple LangChain example.

## Optional: Chroma for RAG

For RAG experiments that use the nutrition knowledge base, run Chroma:

```bash
docker run --rm -p 8001:8000 chromadb/chroma:0.6.1
```

Then set `CHROMA_URL=http://localhost:8001` in `.env` or in a notebook cell.

## Conventions

- **Naming:** Number notebooks in order: `01-agent-basics.ipynb`, `02-rag-exploration.ipynb`, etc.
- **Archive:** Move deprecated or obsolete notebooks to `archive/`.
