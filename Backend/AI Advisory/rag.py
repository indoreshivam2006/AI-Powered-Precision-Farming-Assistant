"""
RAG module — ChromaDB vector store + retriever for farming knowledge base.
Loads .txt files from the knowledge/ directory, chunks them, and builds
a persistent ChromaDB collection for semantic search.
"""

import os
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Use a lightweight, fast embedding model
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
KNOWLEDGE_DIR = os.path.join(os.path.dirname(__file__), "knowledge")
CHROMA_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "chroma_db")
COLLECTION_NAME = "kisamitra_knowledge"

embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def build_vector_store():
    """
    Build (or rebuild) the ChromaDB vector store from knowledge/ directory.
    Call this once initially or whenever knowledge files are updated.
    """
    print(f"[INFO] Loading documents from {KNOWLEDGE_DIR} ...")
    loader = DirectoryLoader(
        KNOWLEDGE_DIR,
        glob="**/*.txt",
        loader_cls=TextLoader,
        loader_kwargs={"encoding": "utf-8"},
    )
    docs = loader.load()
    print(f"   Loaded {len(docs)} document(s).")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )
    chunks = splitter.split_documents(docs)
    print(f"   Split into {len(chunks)} chunks.")

    db = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_PERSIST_DIR,
    )
    print(f"[OK] ChromaDB collection '{COLLECTION_NAME}' saved to {CHROMA_PERSIST_DIR}")
    return db


def load_vector_store():
    """
    Load an existing ChromaDB collection. If it doesn't exist, build it first.
    """
    if not os.path.exists(CHROMA_PERSIST_DIR):
        print("[WARN] ChromaDB not found -- building from knowledge/ ...")
        return build_vector_store()

    db = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )

    # If the collection is empty (e.g. directory exists but no data), rebuild
    if db._collection.count() == 0:
        print("[WARN] ChromaDB collection is empty -- rebuilding from knowledge/ ...")
        return build_vector_store()

    print(f"[OK] Loaded ChromaDB collection '{COLLECTION_NAME}' "
          f"({db._collection.count()} vectors) from {CHROMA_PERSIST_DIR}")
    return db


# Create retriever (lazy-loaded on first import)
retriever = load_vector_store().as_retriever(search_kwargs={"k": 3})


# Allow rebuilding from command line: python rag.py
if __name__ == "__main__":
    # If run directly, the module-level 'retriever' initialization will already 
    # build the DB if it's missing. We can add a function to force rebuild here if needed, 
    # but for testing, we just use the loaded retriever.
    print("[TEST] Testing retriever ...")
    test_query = "What crop should I grow in black soil in Vidarbha?"
    docs = retriever.invoke(test_query)
    for i, doc in enumerate(docs, 1):
        print(f"\n--- Result {i} ---")
        print(doc.page_content[:200])
