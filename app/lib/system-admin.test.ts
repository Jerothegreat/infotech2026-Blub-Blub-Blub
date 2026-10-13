import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTenantHandlers } from "../app/api/v1/system/tenants/route";
import {
  createTenant,
  createUser,
  getTenant,
  requireSystemAdmin,
  SystemAdminError,
  type SqlDatabase,
  type Tenant,
  type AdminUser,
  type VerifiedSystemActor,
} from "./system-admin";

class FakeDatabase implements SqlDatabase {
  tenants: Tenant[] = [{ id: 1, name: "CCIS", slug: "ccis" }];
  users: AdminUser[] = [];
  assignments: Array<{ userId: number; departmentId: number }> = [];
  async all<T>(sql: string): Promise<T> {
    if (sql.includes("FROM departments")) return this.tenants as T;
    return this.users as T;
  }
  async get<T>(sql: string, id: number): Promise<T | undefined> {
    if (sql.includes("FROM departments")) return this.tenants.find((tenant) => tenant.id === id) as T | undefined;
    return this.users.find((user) => user.id === id) as T | undefined;
  }
  async run(sql: string, ...parameters: unknown[]) {
    if (sql.startsWith("INSERT INTO departments")) {
      const tenant = { id: this.tenants.length + 1, name: parameters[0] as string, slug: parameters[1] as string };
      if (this.tenants.some((item) => item.slug === tenant.slug)) throw new Error("UNIQUE constraint failed");
      this.tenants.push(tenant);
      return { lastID: tenant.id };
    }
    if (sql.startsWith("INSERT INTO users")) {
      const user = { id: this.users.length + 1, email: parameters[0] as string, name: parameters[1] as string, role: parameters[2] as AdminUser["role"], departmentId: parameters[3] as number, createdAt: parameters[4] as string };
      this.users.push(user);
      return { lastID: user.id };
    }
    if (sql.startsWith("INSERT INTO department_admin_assignments")) {
      this.assignments.push({ userId: parameters[0] as number, departmentId: parameters[1] as number });
      return { changes: 1 };
    }
    return { changes: 1 };
  }
}

const systemAdmin: VerifiedSystemActor = { id: 10, role: "system_admin", departmentId: null };
const departmentAdmin: VerifiedSystemActor = { id: 11, role: "department_admin", departmentId: 1 };

describe("system admin service", () => {
  it("denies non-system-admin actors", () => {
    assert.throws(() => requireSystemAdmin(departmentAdmin), { code: "FORBIDDEN", status: 403 });
  });

  it("rejects invalid tenant payloads and duplicate slugs", async () => {
    const database = new FakeDatabase();
    await assert.rejects(createTenant(database, { name: "", slug: "bad" }), { code: "INVALID_INPUT", status: 400 });
    await assert.rejects(createTenant(database, { name: "CAS", slug: "ccis" }), { code: "CONFLICT", status: 409 });
  });

  it("requires an existing department and valid role for users", async () => {
    const database = new FakeDatabase();
    await assert.rejects(createUser(database, { email: "admin@example.test", name: "Admin", role: "department_admin", departmentId: 99 }), { code: "INVALID_INPUT", status: 400 });
    await assert.rejects(createUser(database, { email: "admin@example.test", name: "Admin", role: "owner", departmentId: 1 }), { code: "INVALID_INPUT", status: 400 });
  });

  it("persists a department-admin assignment with the user", async () => {
    const database = new FakeDatabase();
    await createUser(database, {
      email: "admin@example.test",
      name: "Department Admin",
      role: "department_admin",
      departmentId: 1,
    });
    assert.deepEqual(database.assignments, [{ userId: 1, departmentId: 1 }]);
  });

  it("returns safe tenant fields through the injected route handler", async () => {
    const database = new FakeDatabase();
    const handlers = createTenantHandlers(async () => ({ database, actor: systemAdmin }));
    const response = await handlers.POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ name: "CAS", slug: "cas", role: "system_admin" }) }));
    assert.equal(response.status, 400);
    const success = await handlers.POST(new Request("https://example.test", { method: "POST", body: JSON.stringify({ name: "CAS", slug: "cas" }) }));
    assert.equal(success.status, 201);
    assert.deepEqual(await success.json(), { tenant: { id: 2, name: "CAS", slug: "cas" } });
  });

  it("returns 403 before touching the database", async () => {
    const database = new FakeDatabase();
    const handlers = createTenantHandlers(async () => ({ database, actor: departmentAdmin }));
    const response = await handlers.GET(new Request("https://example.test"));
    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: { code: "FORBIDDEN", message: "System administrator access required" } });
  });

  it("reports missing tenants deterministically", async () => {
    await assert.rejects(getTenant(new FakeDatabase(), 99), new SystemAdminError("NOT_FOUND", "Tenant not found", 404));
  });
});
