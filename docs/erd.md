# HeronHub Entity Relationship Diagram

This is the starting data model for the admin studio, student hub, and strictly grounded chatbot. Timestamps are UTC ISO-8601 values. IDs are SQLite integer primary keys unless noted otherwise.

```mermaid
erDiagram
  DEPARTMENTS {
    integer id PK
    text name
    text slug UK
  }

  USERS {
    integer id PK
    text email UK
    text name
    text role "student | department_admin | system_admin"
    integer department_id FK
    text created_at
  }

  UPLOADS {
    integer id PK
    text name "original filename"
    text hash UK "SHA-256 content hash"
    integer size_bytes
    text uploaded_at
  }

  SOURCE_DOCUMENTS {
    integer id PK
    integer department_id FK
    text title
    text status "active | retired"
    integer current_version_id FK
    text created_at
    text retired_at
  }

  DOCUMENT_VERSIONS {
    integer id PK
    integer source_document_id FK
    integer upload_id FK
    integer version_number
    text indexed_at
    text indexing_status "pending | indexed | failed"
    text created_at
  }

  KNOWLEDGE_CHUNKS {
    integer id PK
    integer document_version_id FK
    integer department_id FK
    text section_heading
    text content
    integer sequence
  }

  ANNOUNCEMENTS {
    integer id PK
    integer created_by_user_id FK
    text type "banner | reminder | seasonal_campaign"
    text title
    text body
    text starts_at
    text ends_at
    text status "draft | published | archived"
    text created_at
  }

  ANNOUNCEMENT_AUDIENCES {
    integer announcement_id FK
    integer department_id FK
  }

  QUERIES {
    integer id PK
    integer user_id FK
    integer department_id FK
    text question
    real top_retrieval_score
    text outcome "answered | refused | error"
    text answer
    text created_at
  }

  QUERY_CITATIONS {
    integer query_id FK
    integer knowledge_chunk_id FK
  }

  ANSWER_FEEDBACK {
    integer id PK
    integer query_id FK
    integer user_id FK
    integer rating "up | down"
    text comment
    text created_at
  }

  DEPARTMENTS ||--o{ USERS : has_students
  DEPARTMENTS ||--o{ SOURCE_DOCUMENTS : owns
  DEPARTMENTS ||--o{ KNOWLEDGE_CHUNKS : scopes
  SOURCE_DOCUMENTS ||--o{ DOCUMENT_VERSIONS : has
  UPLOADS ||--o| DOCUMENT_VERSIONS : supplies
  DOCUMENT_VERSIONS ||--o{ KNOWLEDGE_CHUNKS : produces
  USERS ||--o{ ANNOUNCEMENTS : creates
  ANNOUNCEMENTS ||--o{ ANNOUNCEMENT_AUDIENCES : targets
  DEPARTMENTS ||--o{ ANNOUNCEMENT_AUDIENCES : receives
  USERS ||--o{ QUERIES : asks
  DEPARTMENTS ||--o{ QUERIES : scopes
  QUERIES ||--o{ QUERY_CITATIONS : contains
  KNOWLEDGE_CHUNKS ||--o{ QUERY_CITATIONS : supports
  QUERIES ||--o{ ANSWER_FEEDBACK : receives
  USERS ||--o{ ANSWER_FEEDBACK : submits
```

## Model Rules

- `uploads` records each physical file once. A SHA-256 `hash` is unique to prevent duplicate ingestion; `name` is the original filename and is not unique.
- `source_documents` is the durable logical document. Replacing a file creates a new `document_versions` row and updates `current_version_id`; previous versions remain auditable.
- Retiring a document changes `source_documents.status` to `retired`. Its chunks must be excluded from retrieval without deleting the history.
- Every user belongs to one department. Student views, document retrieval, announcement audiences, and query analytics are scoped to that department.
- A banner, reminder, or seasonal campaign is one `announcements` record. It can target several departments through `announcement_audiences`.
- A refused query is a `queries` record with `outcome = 'refused'`. The admin gap list is a filtered view of those rows, grouped by department and question.
- Every visible chatbot citation is stored in `query_citations`, linking the answer to the exact chunk used. This makes source-grounding auditable.
- `answer_feedback` supports the P1 thumbs-up/down control and optional comment. CSV export is generated from this table and its query metadata rather than persisted as a separate entity.

## Initial SQLite Migration Order

1. `0001_init.sql`: `departments`, `users`, and `uploads`.
2. `0002_knowledge_base.sql`: document, version, and chunk tables.
3. `0003_announcements.sql`: announcement and audience tables.
4. `0004_query_analytics.sql`: query, citation, and feedback tables.

`current_version_id` is added after `document_versions` exists, or populated within the same migration with SQLite foreign keys enabled.
