import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { openDatabase } from "./db";

describe("SQLite boundary", () => {
  it("opens an isolated database with foreign keys and migrations enabled", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "heronhub-db-"));
    const databasePath = path.join(directory, "test.sqlite");
    const database = await openDatabase({ databasePath });

    try {
      const foreignKeys = await database.get<{ foreign_keys: number }>(
        "PRAGMA foreign_keys",
      );
      const tables = await database.all<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      );

      assert.equal(foreignKeys?.foreign_keys, 1);
      assert.equal(tables.length, 1);
    } finally {
      await database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not share test databases between connections", async () => {
    const firstDirectory = await mkdtemp(path.join(os.tmpdir(), "heronhub-db-"));
    const secondDirectory = await mkdtemp(path.join(os.tmpdir(), "heronhub-db-"));
    const first = await openDatabase({
      databasePath: path.join(firstDirectory, "first.sqlite"),
    });
    const second = await openDatabase({
      databasePath: path.join(secondDirectory, "second.sqlite"),
    });

    try {
      await first.run(
        "INSERT INTO departments (name, slug) VALUES (?, ?)",
        "First",
        "first",
      );
      const rows = await second.all("SELECT * FROM departments");

      assert.deepEqual(rows, []);
    } finally {
      await first.close();
      await second.close();
      await rm(firstDirectory, { recursive: true, force: true });
      await rm(secondDirectory, { recursive: true, force: true });
    }
  });
});
