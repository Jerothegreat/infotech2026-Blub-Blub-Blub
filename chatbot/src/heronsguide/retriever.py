"""Scoped retrieval without embeddings.

The whole knowledge base is about 20k tokens, so every section in the student's scope fits in
the model's context. This keeps multi-hop questions (an office from Source01, its room from
Source03) working. Swap in a BM25 or vector retriever here if the knowledge base grows.
"""

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from .kb import in_scope


class ScopedSectionRetriever(BaseRetriever):
    sections: list[Document]
    college: str | None = None

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> list[Document]:
        return [s for s in self.sections if in_scope(s, self.college)]
