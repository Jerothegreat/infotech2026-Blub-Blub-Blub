import { mkdir } from "node:fs/promises";
import path from "node:path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const databasePath = path.resolve(
  process.env.DATABASE_PATH ?? "data/heronhub.sqlite",
);

async function migrate() {
  await mkdir(path.dirname(databasePath), { recursive: true });

  const database = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  try {
    await database.exec("PRAGMA foreign_keys = ON");
    await database.migrate({
      migrationsPath: path.resolve("migrations"),
    });
  } finally {
    await database.close();
  }
}

migrate().catch((error: unknown) => {
  console.error("Failed to run SQLite migrations.", error);
  process.exitCode = 1;
});
