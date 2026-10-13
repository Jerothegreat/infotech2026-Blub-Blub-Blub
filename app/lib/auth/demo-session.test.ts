import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { openDatabase } from "../db";
import {
  createDemoSession,
  getDemoAccount,
  getDemoSessionActor,
  validDemoCredentials,
} from "./demo-session";

describe("demo department-admin session", () => {
  it("creates an opaque session for the CCIS department admin", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "heronhub-session-"));
    const database = await openDatabase({ databasePath: path.join(directory, "test.sqlite") });
    try {
      const account = getDemoAccount("ccis.sc@umak.edu.ph", "1234567890");
      assert.ok(account);
      const session = await createDemoSession(database, account);
      const actor = await getDemoSessionActor(new Request("https://example.test", {
        headers: { cookie: `heronhub_demo_session=${session.token}` },
      }), database);

      assert.deepEqual(actor, { id: 1, role: "department_admin", departmentId: session.departmentId });
      assert.equal(validDemoCredentials("ccis.sc@umak.edu.ph", "1234567890"), true);
      assert.equal(validDemoCredentials("ccis.sc@umak.edu.ph", "wrong"), false);
    } finally {
      await database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("creates an opaque session for the system admin demo account", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "heronhub-session-"));
    const database = await openDatabase({ databasePath: path.join(directory, "test.sqlite") });
    try {
      const account = getDemoAccount("umak@umak.edu.ph", "1234567890");
      assert.ok(account);
      const session = await createDemoSession(database, account);
      const actor = await getDemoSessionActor(new Request("https://example.test", {
        headers: { cookie: `heronhub_demo_session=${session.token}` },
      }), database);

      assert.deepEqual(actor, { id: 1, role: "system_admin", departmentId: session.departmentId });
      assert.equal(validDemoCredentials("umak@umak.edu.ph", "1234567890"), true);
    } finally {
      await database.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
