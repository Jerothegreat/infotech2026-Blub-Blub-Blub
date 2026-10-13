export type SystemAdminRole = "student" | "department_admin" | "system_admin";

export interface VerifiedSystemActor {
  id: number;
  role: SystemAdminRole;
  departmentId: number | null;
}

export interface SqlDatabase {
  all<T>(sql: string, ...parameters: unknown[]): Promise<T>;
  get<T>(sql: string, ...parameters: unknown[]): Promise<T | undefined>;
  run(sql: string, ...parameters: unknown[]): Promise<{ lastID?: number; changes?: number }>;
}

export class SystemAdminError extends Error {
  constructor(
    readonly code: "INVALID_INPUT" | "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INTERNAL_ERROR",
    message: string,
    readonly status: 400 | 403 | 404 | 409 | 500,
  ) {
    super(message);
  }
}

export type Tenant = { id: number; name: string; slug: string };
export type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: SystemAdminRole;
  departmentId: number;
  createdAt: string;
};

type TenantRow = Tenant;
type UserRow = AdminUser;

const roles = new Set<SystemAdminRole>([
  "student",
  "department_admin",
  "system_admin",
]);

function objectPayload(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SystemAdminError("INVALID_INPUT", "Request body must be an object", 400);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new SystemAdminError("INVALID_INPUT", `${field} is required`, 400);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function rejectUnknown(payload: Record<string, unknown>, allowed: Set<string>) {
  const unknown = Object.keys(payload).find((key) => !allowed.has(key));
  if (unknown) {
    throw new SystemAdminError("INVALID_INPUT", `Unknown field: ${unknown}`, 400);
  }
}

function parseTenant(payload: unknown, partial: boolean): { name?: string; slug?: string } {
  const body = objectPayload(payload);
  rejectUnknown(body, new Set(["name", "slug"]));
  const name = optionalString(body.name, "name");
  const slug = optionalString(body.slug, "slug");
  if (!partial && (!name || !slug)) {
    throw new SystemAdminError("INVALID_INPUT", "name and slug are required", 400);
  }
  if (partial && !name && !slug) {
    throw new SystemAdminError("INVALID_INPUT", "At least one field is required", 400);
  }
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new SystemAdminError("INVALID_INPUT", "slug must use lowercase URL-safe text", 400);
  }
  return { name, slug };
}

function parseUser(payload: unknown, partial: boolean) {
  const body = objectPayload(payload);
  rejectUnknown(body, new Set(["email", "name", "role", "departmentId"]));
  const email = optionalString(body.email, "email");
  const name = optionalString(body.name, "name");
  const rawDepartmentId = body.departmentId;
  const departmentId = rawDepartmentId === undefined ? undefined : rawDepartmentId;
  if (departmentId !== undefined && (typeof departmentId !== "number" || !Number.isInteger(departmentId) || departmentId < 1)) {
    throw new SystemAdminError("INVALID_INPUT", "departmentId must be a positive integer", 400);
  }
  const role = body.role === undefined ? undefined : body.role;
  if (role !== undefined && (typeof role !== "string" || !roles.has(role as SystemAdminRole))) {
    throw new SystemAdminError("INVALID_INPUT", "role is invalid", 400);
  }
  if (!partial && (!email || !name || !role || departmentId === undefined)) {
    throw new SystemAdminError("INVALID_INPUT", "email, name, role, and departmentId are required", 400);
  }
  if (partial && email === undefined && name === undefined && role === undefined && departmentId === undefined) {
    throw new SystemAdminError("INVALID_INPUT", "At least one field is required", 400);
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    throw new SystemAdminError("INVALID_INPUT", "email is invalid", 400);
  }
  return { email, name, role: role as SystemAdminRole | undefined, departmentId: departmentId as number | undefined };
}

export function requireSystemAdmin(actor: VerifiedSystemActor): void {
  if (actor.role !== "system_admin") {
    throw new SystemAdminError("FORBIDDEN", "System administrator access required", 403);
  }
}

async function departmentExists(database: SqlDatabase, departmentId: number) {
  const row = await database.get<{ id: number }>("SELECT id FROM departments WHERE id = ?", departmentId);
  if (!row) throw new SystemAdminError("INVALID_INPUT", "departmentId does not exist", 400);
}

export async function listTenants(database: SqlDatabase): Promise<Tenant[]> {
  return database.all<TenantRow[]>("SELECT id, name, slug FROM departments ORDER BY id").then((rows) => rows);
}

export async function getTenant(database: SqlDatabase, id: number): Promise<Tenant> {
  const row = await database.get<TenantRow>("SELECT id, name, slug FROM departments WHERE id = ?", id);
  if (!row) throw new SystemAdminError("NOT_FOUND", "Tenant not found", 404);
  return row;
}

export async function createTenant(database: SqlDatabase, payload: unknown): Promise<Tenant> {
  const { name, slug } = parseTenant(payload, false) as { name: string; slug: string };
  try {
    const result = await database.run("INSERT INTO departments (name, slug) VALUES (?, ?)", name, slug);
    return { id: result.lastID as number, name, slug };
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new SystemAdminError("CONFLICT", "Tenant name or slug already exists", 409);
    throw error;
  }
}

export async function updateTenant(database: SqlDatabase, id: number, payload: unknown): Promise<Tenant> {
  const changes = parseTenant(payload, true);
  await getTenant(database, id);
  try {
    await database.run(
      "UPDATE departments SET name = COALESCE(?, name), slug = COALESCE(?, slug) WHERE id = ?",
      changes.name ?? null,
      changes.slug ?? null,
      id,
    );
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new SystemAdminError("CONFLICT", "Tenant name or slug already exists", 409);
    throw error;
  }
  return getTenant(database, id);
}

export async function listUsers(database: SqlDatabase): Promise<AdminUser[]> {
  return database.all<UserRow[]>("SELECT id, email, name, role, department_id AS departmentId, created_at AS createdAt FROM users ORDER BY id").then((rows) => rows);
}

export async function getUser(database: SqlDatabase, id: number): Promise<AdminUser> {
  const row = await database.get<UserRow>("SELECT id, email, name, role, department_id AS departmentId, created_at AS createdAt FROM users WHERE id = ?", id);
  if (!row) throw new SystemAdminError("NOT_FOUND", "User not found", 404);
  return row;
}

export async function createUser(database: SqlDatabase, payload: unknown, now = new Date().toISOString()): Promise<AdminUser> {
  const parsed = parseUser(payload, false) as { email: string; name: string; role: SystemAdminRole; departmentId: number };
  await departmentExists(database, parsed.departmentId);
  try {
    const result = await database.run(
      "INSERT INTO users (email, name, role, department_id, created_at) VALUES (?, ?, ?, ?, ?)",
      parsed.email,
      parsed.name,
      parsed.role,
      parsed.departmentId,
      now,
    );
    const user = await getUser(database, result.lastID as number);
    if (user.role === "department_admin") {
      await database.run(
        "INSERT INTO department_admin_assignments (user_id, department_id, assigned_at) VALUES (?, ?, ?)",
        user.id,
        user.departmentId,
        now,
      );
    }
    return user;
  } catch (error) {
    if (String(error).includes("UNIQUE")) throw new SystemAdminError("CONFLICT", "Email already exists", 409);
    throw error;
  }
}

export async function updateUser(database: SqlDatabase, id: number, payload: unknown): Promise<AdminUser> {
  const changes = parseUser(payload, true);
  const existing = await getUser(database, id);
  if (changes.departmentId !== undefined) await departmentExists(database, changes.departmentId);
  const nextRole = changes.role ?? existing.role;
  const nextDepartmentId = changes.departmentId ?? existing.departmentId;
  if (existing.role === "department_admin" && nextRole !== "department_admin") {
    await database.run("DELETE FROM department_admin_assignments WHERE user_id = ?", id);
  }
  await database.run(
    "UPDATE users SET email = COALESCE(?, email), name = COALESCE(?, name), role = COALESCE(?, role), department_id = COALESCE(?, department_id) WHERE id = ?",
    changes.email ?? null,
    changes.name ?? null,
    changes.role ?? null,
    changes.departmentId ?? null,
    id,
  );
  if (nextRole === "department_admin") {
    await database.run("DELETE FROM department_admin_assignments WHERE user_id = ?", id);
    await database.run(
      "INSERT INTO department_admin_assignments (user_id, department_id, assigned_at) VALUES (?, ?, ?)",
      id,
      nextDepartmentId,
      new Date().toISOString(),
    );
  }
  return getUser(database, id);
}
