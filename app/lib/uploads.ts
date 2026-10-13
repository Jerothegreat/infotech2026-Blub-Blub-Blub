import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SqliteDatabase } from "./db";

export type StoredUpload = {
  id: number;
  name: string;
  hash: string;
  sizeBytes: number;
  uploadedAt: string;
  path: string;
};

const uploadRoot = () =>
  path.resolve(
    process.env.UPLOAD_ROOT ?? path.join(process.cwd(), "..", "uploads"),
  );

function safeName(name: string) {
  const base = path.basename(name).replace(/[^A-Za-z0-9._-]/g, "_");
  return base || "upload";
}

/** The only seam allowed to write source bytes to disk. */
export async function storeUpload(
  database: SqliteDatabase,
  file: File,
  now = new Date().toISOString(),
): Promise<StoredUpload> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const existing = await database.get<{
    id: number;
    name: string;
    hash: string;
    size_bytes: number;
    uploaded_at: string;
  }>("SELECT id, name, hash, size_bytes, uploaded_at FROM uploads WHERE hash = ?", hash);

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      hash: existing.hash,
      sizeBytes: existing.size_bytes,
      uploadedAt: existing.uploaded_at,
      path: path.join(uploadRoot(), `${hash}-${safeName(existing.name)}`),
    };
  }

  const root = uploadRoot();
  const filename = `${hash}-${safeName(file.name)}`;
  const storedPath = path.join(root, filename);
  let uploadId: number;
  try {
    const result = await database.run(
      "INSERT INTO uploads (name, hash, size_bytes, uploaded_at) VALUES (?, ?, ?, ?)",
      file.name || "upload",
      hash,
      bytes.byteLength,
      now,
    );
    uploadId = result.lastID as number;
  } catch (error) {
    // A concurrent identical upload owns the same physical file and metadata.
    if (!(error as { code?: string }).code?.startsWith("SQLITE_CONSTRAINT")) throw error;
    const row = await database.get<{
      id: number;
      name: string;
      hash: string;
      size_bytes: number;
      uploaded_at: string;
    }>("SELECT id, name, hash, size_bytes, uploaded_at FROM uploads WHERE hash = ?", hash);
    if (!row) throw error;
    return {
      id: row.id,
      name: row.name,
      hash: row.hash,
      sizeBytes: row.size_bytes,
      uploadedAt: row.uploaded_at,
      path: storedPath,
    };
  }

  try {
    await mkdir(root, { recursive: true });
    await writeFile(storedPath, bytes, { flag: "wx" });
  } catch (error) {
    await database.run("DELETE FROM uploads WHERE id = ?", uploadId);
    throw error;
  }

  return {
    id: uploadId,
    name: file.name || "upload",
    hash,
    sizeBytes: bytes.byteLength,
    uploadedAt: now,
    path: storedPath,
  };
}
