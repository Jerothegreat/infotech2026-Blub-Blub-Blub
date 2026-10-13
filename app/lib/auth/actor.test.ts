import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createTestActorVerifier,
  requireDepartmentAccess,
  requireRole,
  requireVerifiedActor,
  type VerifiedActor,
} from "./actor";

const departmentAdmin: VerifiedActor = {
  id: 7,
  role: "department_admin",
  departmentId: 12,
};

describe("verified actor authorization", () => {
  it("uses the injected verified actor instead of request data", async () => {
    const request = new Request(
      "https://example.test/api?departmentId=99&role=system_admin",
      {
        method: "POST",
        headers: { "x-user-id": "999" },
        body: JSON.stringify({ departmentId: 99, role: "system_admin" }),
      },
    );

    const actor = await requireVerifiedActor(
      request,
      createTestActorVerifier(departmentAdmin),
    );

    assert.deepEqual(actor, departmentAdmin);
  });

  it("rejects requests without a verified actor", async () => {
    await assert.rejects(
      requireVerifiedActor(new Request("https://example.test"), async () => null),
      { code: "FORBIDDEN", status: 403 },
    );
  });

  it("enforces role and department boundaries", () => {
    assert.throws(() => requireRole(departmentAdmin, "system_admin"), {
      code: "FORBIDDEN",
      status: 403,
    });
    assert.throws(() => requireDepartmentAccess(departmentAdmin, 99), {
      code: "FORBIDDEN",
      status: 403,
    });
    assert.doesNotThrow(() => requireDepartmentAccess(departmentAdmin, 12));
  });
});
