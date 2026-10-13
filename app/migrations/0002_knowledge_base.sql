CREATE TABLE source_documents (
  id INTEGER PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'retired')),
  created_at TEXT NOT NULL,
  retired_at TEXT
);

CREATE INDEX source_documents_department_id_idx ON source_documents (department_id);

CREATE TABLE document_versions (
  id INTEGER PRIMARY KEY,
  source_document_id INTEGER NOT NULL REFERENCES source_documents(id),
  upload_id INTEGER NOT NULL REFERENCES uploads(id),
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  created_at TEXT NOT NULL,
  UNIQUE (source_document_id, version_number)
);

CREATE INDEX document_versions_upload_id_idx ON document_versions (upload_id);

ALTER TABLE source_documents
ADD COLUMN current_version_id INTEGER REFERENCES document_versions(id);

CREATE TABLE knowledge_chunks (
  id INTEGER PRIMARY KEY,
  document_version_id INTEGER NOT NULL REFERENCES document_versions(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  section_heading TEXT,
  content TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 0),
  UNIQUE (document_version_id, sequence)
);

CREATE INDEX knowledge_chunks_department_id_idx ON knowledge_chunks (department_id);
