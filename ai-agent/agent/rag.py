"""RAG pipeline for nutrition knowledge retrieval."""

import os
from pathlib import Path

from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStoreRetriever


def get_nutrition_documents() -> list[Document]:
    """Load nutrition knowledge documents from the knowledge directory."""
    knowledge_dir = Path(__file__).parent.parent / "knowledge"
    docs = []
    if knowledge_dir.exists():
        for f in knowledge_dir.glob("*.txt"):
            content = f.read_text(encoding="utf-8")
            docs.append(Document(page_content=content, metadata={"source": str(f.name)}))
    return docs


def build_retriever(persist_directory: str | None = None) -> VectorStoreRetriever:
    """Build ChromaDB retriever with OpenAI embeddings."""
    persist_dir = persist_directory or str(Path(__file__).parent.parent / "chroma_db")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    docs = get_nutrition_documents()

    if docs:
        vectorstore = Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            persist_directory=persist_dir,
        )
    else:
        # Create empty store if no docs - will return empty results
        vectorstore = Chroma(
            embedding_function=embeddings,
            persist_directory=persist_dir,
        )

    return vectorstore.as_retriever(search_kwargs={"k": 4})


# Module-level retriever - initialized on first use
_retriever: VectorStoreRetriever | None = None


def get_retriever() -> VectorStoreRetriever:
    """Get or create the nutrition knowledge retriever."""
    global _retriever
    if _retriever is None:
        _retriever = build_retriever()
    return _retriever
