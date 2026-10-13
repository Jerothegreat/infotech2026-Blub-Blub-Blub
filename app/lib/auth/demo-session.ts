import { createHash, randomBytes } from "node:crypto";
import { openDatabase, type SqliteDatabase } from "../db";
import { ApiError } from "../http/errors";
import type { VerifiedActor } from "./actor";

export const DEMO_SESSION_COOKIE = "heronhub_demo_session";

type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: VerifiedActor["role"];
  department: { name: string; slug: string };
};

const demoAccounts: DemoAccount[] = [
  {
    email: "ccis.sc@umak.edu.ph",
    password: "1234567890",
    name: "CCIS Department Admin",
    role: "department_admin",
    department: { name: "CCIS", slug: "ccis" },
  },
  {
    email: "umak@umak.edu.ph",
    password: "1234567890",
    name: "UMak System Admin",
    role: "system_admin",
    department: { name: "University Administration", slug: "university-administration" },
  },
];

type SessionRow = {
  id: number;
  role: VerifiedActor["role"];
  department_id: number;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  return cookies.split("; ").find((cookie) => cookie.startsWith(`${DEMO_SESSION_COOKIE}=`))?.slice(DEMO_SESSION_COOKIE.length + 1);
}

export function validDemoCredentials(email: unknown, password: unknown) {
  return Boolean(getDemoAccount(email, password));
}

export function getDemoAccount(email: unknown, password: unknown) {
  return demoAccounts.find(
    (account) => account.email === email && account.password === password,
  ) ?? null;
}

export async function createDemoSession(
  database: SqliteDatabase,
  account: DemoAccount,
) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000);
  let departmentId = 0;
  await database.exec("BEGIN");
  try {
    await database.run(
      "INSERT OR IGNORE INTO departments (name, slug) VALUES (?, ?)",
      account.department.name,
      account.department.slug,
    );
    const department = await database.get<{ id: number }>(
      "SELECT id FROM departments WHERE slug = ?",
      account.department.slug,
    );
    if (!department) throw new ApiError("INTERNAL_ERROR", "Unable to create the demo department", 500);
    departmentId = department.id;
    await database.run(
      "INSERT OR IGNORE INTO users (email, name, role, department_id, created_at) VALUES (?, ?, ?, ?, ?)",
      account.email,
      account.name,
      account.role,
      department.id,
      createdAt.toISOString(),
    );
    const user = await database.get<{ id: number; role: string; department_id: number }>(
      "SELECT id, role, department_id FROM users WHERE email = ?",
      account.email,
    );
    if (!user || user.role !== account.role || user.department_id !== department.id) {
      throw new ApiError("FORBIDDEN", "The demo account is not assigned correctly", 403);
    }
    if (account.role === "department_admin") {
      await database.run(
        "INSERT OR IGNORE INTO department_admin_assignments (user_id, department_id, assigned_at) VALUES (?, ?, ?)",
        user.id,
        department.id,
        createdAt.toISOString(),
      );
    }
    await database.run(
      "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      hashToken(token),
      user.id,
      expiresAt.toISOString(),
      createdAt.toISOString(),
    );
    await database.exec("COMMIT");
  } catch (error) {
    await database.exec("ROLLBACK");
    throw error;
  }
  return { token, expiresAt, departmentId };
}

export async function getDemoSessionActor(
  request: Request,
  existingDatabase?: SqliteDatabase,
): Promise<VerifiedActor | null> {
  const token = cookieValue(request);
  if (!token) return null;

  const database = existingDatabase ?? await openDatabase();
  try {
    const row = await database.get<SessionRow>(
      `SELECT u.id, u.role, u.department_id
         FROM sessions s
         JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?`,
      hashToken(token),
      new Date().toISOString(),
    );
    if (!row || (row.role !== "department_admin" && row.role !== "system_admin")) return null;
    return { id: row.id, role: row.role, departmentId: row.department_id };
  } finally {
    if (!existingDatabase) await database.close();
  }
}

export async function deleteDemoSession(request: Request) {
  const token = cookieValue(request);
  if (!token) return;
  const database = await openDatabase();
  try {
    await database.run("DELETE FROM sessions WHERE token_hash = ?", hashToken(token));
  } finally {
    await database.close();
  }
}
