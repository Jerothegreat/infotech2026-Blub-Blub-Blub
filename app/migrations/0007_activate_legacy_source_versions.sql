UPDATE source_documents
SET current_version_id = (
  SELECT id
  FROM document_versions
  WHERE source_document_id = source_documents.id
  ORDER BY version_number DESC
  LIMIT 1
)
WHERE current_version_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM document_versions
    WHERE source_document_id = source_documents.id
  );
