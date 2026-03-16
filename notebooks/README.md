# Notebooks

Jupyter notebooks for exploring the NutriGuide AI agent architecture. Each notebook has its own dependencies and setup.

## Contents

| Folder        | Description                          |
|---------------|--------------------------------------|
| `langgraph-ts/` | TypeScript LangGraph agent notebook |
| `langgraph-py/` | Python LangGraph agent notebook     |

## tslab (TypeScript kernel)

The TypeScript notebooks use **tslab**, a Jupyter kernel that runs TypeScript/JavaScript in notebooks with Node.js. Install it globally:

```bash
npm install -g tslab
tslab install
```

Or install locally in `langgraph-ts/` and register the kernel:

```bash
cd notebooks/langgraph-ts
npm install
npx tslab install
```

Prerequisites: Node.js (LTS) and Python 3.x with Jupyter. See [tslab on GitHub](https://github.com/yunabe/tslab) for details.

## langgraph-ts (TypeScript)

TypeScript notebook using LangGraph.js, LangChain, and Node.js. Has its own `package.json` and `node_modules` for isolation. Requires the **tslab** kernel (see above).

### Setup

```bash
cd notebooks/langgraph-ts
npm install
npx tslab install   # if not installed globally
```

### Running

Open `agent-ts.ipynb` in VS Code, Cursor, or Jupyter. Select the **tslab** kernel. The notebook loads `.env` from the project root (or from `notebooks/langgraph-ts/` if present).

### Dependencies

- TypeScript, `@types/node` (dev)
- dotenv (loads `.env` from project root)

## langgraph-py (Python)

Python notebook using LangGraph and LangChain. Uses the project's Python environment (e.g. `ai-agent/` or a shared venv).

### Running

Open `agent-py.ipynb` with a Python kernel. Ensure the Python environment has the required packages (langgraph, langchain, etc.).
