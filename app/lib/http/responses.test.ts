import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acceptedResponse,
  createdResponse,
  jsonResponse,
  noContentResponse,
} from "./responses";

describe("HTTP response helpers", () => {
  it("uses stable status codes for common responses", async () => {
    assert.equal(jsonResponse({ ok: true }).status, 200);
    assert.equal(createdResponse({ id: 1 }).status, 201);
    assert.equal(acceptedResponse({ status: "pending" }).status, 202);
    assert.equal(noContentResponse().status, 204);
    assert.deepEqual(await createdResponse({ id: 1 }).json(), { id: 1 });
  });
});
