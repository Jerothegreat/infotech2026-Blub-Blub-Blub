import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { openDatabase, type SqliteDatabase } from "./db";
import type { VerifiedActor } from "./auth/actor";
import { createSource, listSources, replaceSource } from "./sources";

const actor: VerifiedActor = { id: 7, role: "department_admin", departmentId: 12 };
const otherActor: VerifiedActor = { id: 8, role: "department_admin", departmentId: 99 };

async function fixture() {
  const directory = await mkdtemp(path.join(os.tmpdir(), "heronhub-source-"));
  const database = await openDatabase({ databasePath: path.join(directory, "test.sqlite") });
  await database.run("INSERT INTO departments (id, name, slug) VALUES (?, ?, ?)", 12, "CCIS", "ccis");
  await database.run("INSERT INTO departments (id, name, slug) VALUES (?, ?, ?)", 99, "CAS", "cas");
  process.env.UPLOAD_ROOT = path.join(directory, "uploads");
  return { database, directory };
}

async function closeFixture(database: SqliteDatabase, directory: string) {
  await database.close();
  await rm(directory, { recursive: true, force: true });
  delete process.env.UPLOAD_ROOT;
}

describe("source lifecycle", () => {
  it("writes through the upload seam and immediately activates replacements", async () => {
    const { database, directory } = await fixture();
    try {
      const first = await createSource(database, actor, "Rules", new File(["old bytes"], "rules.md"), undefined, "2026-10-13T00:00:00.000Z");
      assert.deepEqual(first, { sourceId: 1, versionId: 1, versionNumber: 1 });
      const firstCurrent = await database.get<{ current_version_id: number }>("SELECT current_version_id FROM source_documents WHERE id = ?", first.sourceId);
      assert.equal(firstCurrent?.current_version_id, first.versionId);
      const replacement = await replaceSource(database, actor, first.sourceId, new File(["new bytes"], "rules.md"), "2026-10-13T00:02:00.000Z");
      const current = await database.get<{ current_version_id: number }>("SELECT current_version_id FROM source_documents WHERE id = ?", first.sourceId);
      assert.equal(current?.current_version_id, replacement.versionId);

      const uploads = await database.all<{ name: string; hash: string }[]>("SELECT name, hash FROM uploads ORDER BY id");
      assert.equal(uploads.length, 2);
      assert.match(uploads[1].hash, /^[a-f0-9]{64}$/);
      assert.equal(await readFile(path.join(process.env.UPLOAD_ROOT!, `${uploads[1].hash}-rules.md`), "utf8"), "new bytes");
    } finally {
      await closeFixture(database, directory);
    }
  });

  it("does not expose another department's source", async () => {
    const { database, directory } = await fixture();
    try {
      await createSource(database, actor, "Rules", new File(["bytes"], "rules.md"));
      assert.deepEqual(await listSources(database, otherActor), []);
    } finally {
      await closeFixture(database, directory);
    }
  });

  it("rejects a source registration for an unknown department", async () => {
    const { database, directory } = await fixture();
    try {
      await assert.rejects(
        createSource(
          database,
          { id: 1, role: "system_admin", departmentId: 12 },
          "Rules",
          new File(["bytes"], "rules.md"),
          404,
        ),
        { code: "INVALID_INPUT", status: 400 },
      );
    } finally {
      await closeFixture(database, directory);
    }
  });
});
