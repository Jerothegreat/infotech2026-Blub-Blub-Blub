import type { SqliteDatabase } from "./db";
import type { VerifiedActor } from "./auth/actor";
import { requireDepartmentAccess } from "./auth/actor";
import { ApiError } from "./http/errors";
import { storeUpload, type StoredUpload } from "./uploads";

type SourceRow = {
  id: number;
  department_id: number;
  title: string;
  status: "active" | "retired";
  created_at: string;
  retired_at: string | null;
  current_version_id: number | null;
  version_id: number | null;
  version_number: number | null;
  upload_id: number | null;
  upload_name: string | null;
};

export type Source = {
  id: number;
  departmentId: number;
  title: string;
  status: "active" | "retired";
  createdAt: string;
  retiredAt: string | null;
  currentVersion: {
    id: number;
    versionNumber: number;
    upload: { id: number; name: string };
  } | null;
};

const sourceSelect = `
  SELECT d.id, d.department_id, d.title, d.status, d.created_at, d.retired_at,
         d.current_version_id, v.id AS version_id, v.version_number,
          u.id AS upload_id, u.name AS upload_name
    FROM source_documents d
    LEFT JOIN document_versions v ON v.id = d.current_version_id
    LEFT JOIN uploads u ON u.id = v.upload_id
`;

function requireSourceAdmin(actor: VerifiedActor) {
  if (actor.role !== "department_admin" && actor.role !== "system_admin") {
    throw new ApiError("FORBIDDEN", "You do not have permission to manage sources", 403);
  }
}

function sourceFromRow(row: SourceRow): Source {
  return {
    id: row.id,
    departmentId: row.department_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    retiredAt: row.retired_at,
    currentVersion:
      row.version_id === null || row.upload_id === null || row.upload_name === null
        ? null
        : {
            id: row.version_id,
            versionNumber: row.version_number as number,
            upload: { id: row.upload_id, name: row.upload_name },
          },
  };
}

function departmentScope(actor: VerifiedActor) {
  return actor.role === "system_admin" ? null : actor.departmentId;
}

async function assertSourceAccess(database: SqliteDatabase, actor: VerifiedActor, sourceId: number) {
  const row = await database.get<{ department_id: number }>(
    "SELECT department_id FROM source_documents WHERE id = ?",
    sourceId,
  );
  if (!row) throw new ApiError("NOT_FOUND", "Source not found", 404);
  requireDepartmentAccess(actor, row.department_id);
}

export async function listSources(database: SqliteDatabase, actor: VerifiedActor) {
  requireSourceAdmin(actor);
  const scope = departmentScope(actor);
  const rows = await database.all<SourceRow[]>(
    `${sourceSelect} WHERE d.status = 'active' ${scope === null ? "" : "AND d.department_id = ?"} ORDER BY d.id DESC`,
    ...(scope === null ? [] : [scope]),
  );
  return rows.map(sourceFromRow);
}

async function nextVersion(database: SqliteDatabase, sourceId: number) {
  const row = await database.get<{ version_number: number }>(
    "SELECT COALESCE(MAX(version_number), 0) AS version_number FROM document_versions WHERE source_document_id = ?",
    sourceId,
  );
  return (row?.version_number ?? 0) + 1;
}

async function registerVersion(
  database: SqliteDatabase,
  actor: VerifiedActor,
  upload: StoredUpload,
  title: string,
  sourceId: number | null,
  departmentId: number,
  now: string,
) {
  requireSourceAdmin(actor);
  if (sourceId !== null) await assertSourceAccess(database, actor, sourceId);
  await database.exec("BEGIN");
  try {
    let id = sourceId;
    let versionNumber = 1;
    if (id === null) {
      const source = await database.run(
        "INSERT INTO source_documents (department_id, title, status, created_at) VALUES (?, ?, 'active', ?)",
        departmentId,
        title,
        now,
      );
      id = source.lastID as number;
    } else {
      versionNumber = await nextVersion(database, id);
    }
    const version = await database.run(
      "INSERT INTO document_versions (source_document_id, upload_id, version_number, created_at) VALUES (?, ?, ?, ?)",
      id,
      upload.id,
      versionNumber,
      now,
    );
    await database.run("UPDATE source_documents SET current_version_id = ? WHERE id = ?", version.lastID, id);
    await database.exec("COMMIT");
    return { sourceId: id, versionId: version.lastID as number, versionNumber };
  } catch (error) {
    await database.exec("ROLLBACK");
    throw error;
  }
}

export async function createSource(
  database: SqliteDatabase,
  actor: VerifiedActor,
  title: string,
  file: File,
  departmentId?: number,
  now = new Date().toISOString(),
) {
  requireSourceAdmin(actor);
  if (actor.role !== "system_admin" && departmentId !== undefined && departmentId !== actor.departmentId) {
    throw new ApiError("FORBIDDEN", "You do not have access to this department", 403);
  }
  const targetDepartmentId = departmentId ?? actor.departmentId;
  if (targetDepartmentId === null) {
    throw new ApiError("INVALID_INPUT", "A department is required", 400);
  }
  const department = await database.get<{ id: number }>(
    "SELECT id FROM departments WHERE id = ?",
    targetDepartmentId,
  );
  if (!department) {
    throw new ApiError("INVALID_INPUT", "Department not found", 400);
  }
  const upload = await storeUpload(database, file, now);
  return registerVersion(database, actor, upload, title, null, targetDepartmentId, now);
}

export async function replaceSource(
  database: SqliteDatabase,
  actor: VerifiedActor,
  sourceId: number,
  file: File,
  now = new Date().toISOString(),
) {
  requireSourceAdmin(actor);
  const upload = await storeUpload(database, file, now);
  return registerVersion(database, actor, upload, "", sourceId, actor.departmentId as number, now);
}

export async function retireSource(database: SqliteDatabase, actor: VerifiedActor, sourceId: number, now = new Date().toISOString()) {
  requireSourceAdmin(actor);
  await assertSourceAccess(database, actor, sourceId);
  const result = await database.run(
    "UPDATE source_documents SET status = 'retired', retired_at = ? WHERE id = ? AND status = 'active'",
    now,
    sourceId,
  );
  if (!result.changes) throw new ApiError("NOT_FOUND", "Source not found", 404);
}
