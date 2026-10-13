CREATE TABLE queries (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  question TEXT NOT NULL,
  top_retrieval_score REAL,
  outcome TEXT NOT NULL CHECK (outcome IN ('answered', 'refused', 'error')),
  answer TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX queries_user_id_idx ON queries (user_id);
CREATE INDEX queries_department_id_idx ON queries (department_id);
CREATE INDEX queries_outcome_idx ON queries (outcome);

CREATE TABLE query_citations (
  query_id INTEGER NOT NULL REFERENCES queries(id),
  knowledge_chunk_id INTEGER NOT NULL REFERENCES knowledge_chunks(id),
  PRIMARY KEY (query_id, knowledge_chunk_id)
);

CREATE INDEX query_citations_knowledge_chunk_id_idx ON query_citations (knowledge_chunk_id);

CREATE TABLE answer_feedback (
  id INTEGER PRIMARY KEY,
  query_id INTEGER NOT NULL REFERENCES queries(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  comment TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX answer_feedback_query_id_idx ON answer_feedback (query_id);
CREATE INDEX answer_feedback_user_id_idx ON answer_feedback (user_id);
