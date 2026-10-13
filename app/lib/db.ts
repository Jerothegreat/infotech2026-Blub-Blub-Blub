import { mkdir } from "node:fs/promises";
import path from "node:path";
import { open, type Database } from "sqlite";
import sqlite3 from "sqlite3";

export type SqliteDatabase = Database<sqlite3.Database, sqlite3.Statement>;

export interface OpenDatabaseOptions {
  databasePath?: string;
  migrationsPath?: string;
}

const defaultDatabasePath = path.resolve(
  process.env.DATABASE_PATH ?? "data/heronhub.sqlite",
);

/** The only application boundary for opening and configuring SQLite. */
export async function openDatabase(
  options: OpenDatabaseOptions = {},
): Promise<SqliteDatabase> {
  const databasePath = path.resolve(options.databasePath ?? defaultDatabasePath);
  const migrationsPath = path.resolve(
    options.migrationsPath ?? "migrations",
  );

  await mkdir(path.dirname(databasePath), { recursive: true });

  const database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  try {
    await database.exec("PRAGMA foreign_keys = ON");
    await database.migrate({ migrationsPath });
    return database;
  } catch (error) {
    await database.close();
    throw error;
  }
}
