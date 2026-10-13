import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ApiError,
  errorResponse,
  toApiError,
} from "./errors";

describe("typed API errors", () => {
  it("returns a stable JSON error envelope", async () => {
    const response = errorResponse(
      new ApiError("INVALID_INPUT", "Title is required", 400),
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: "INVALID_INPUT", message: "Title is required" },
    });
  });

  it("normalizes unknown failures without leaking implementation details", () => {
    const error = toApiError(new Error("secret database detail"));

    assert.equal(error.code, "INTERNAL_ERROR");
    assert.equal(error.status, 500);
    assert.equal(error.message, "Internal server error");
  });

  it("maps malformed JSON errors to the stable invalid-input response", async () => {
    const response = errorResponse(new SyntaxError("Unexpected token"));

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: "INVALID_INPUT", message: "Request body must be valid JSON" },
    });
  });
});
