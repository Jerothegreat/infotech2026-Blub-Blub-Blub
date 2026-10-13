import { ApiError } from "../http/errors";
import { getDemoSessionActor } from "./demo-session";

export type ActorRole = "student" | "department_admin" | "system_admin";

export interface VerifiedActor {
  id: number;
  role: ActorRole;
  departmentId: number;
}

export type ActorVerifier = (
  request: Request,
) => Promise<VerifiedActor | null>;

// The demo session is an opaque, HttpOnly cookie backed by SQLite. Request
// bodies, headers, and query parameters are never treated as identity.
const productionActorVerifier: ActorVerifier = getDemoSessionActor;

export function createTestActorVerifier(
  actor: VerifiedActor | null,
): ActorVerifier {
  return async () => actor;
}

export async function requireVerifiedActor(
  request: Request,
  verify: ActorVerifier = productionActorVerifier,
): Promise<VerifiedActor> {
  const actor = await verify(request);
  if (!actor) {
    throw new ApiError("FORBIDDEN", "A verified actor is required", 403);
  }

  return actor;
}

export function requireRole(
  actor: VerifiedActor,
  role: ActorRole,
): VerifiedActor {
  if (actor.role !== role) {
    throw new ApiError("FORBIDDEN", "You do not have permission for this action", 403);
  }

  return actor;
}

export function requireDepartmentAccess(
  actor: VerifiedActor,
  departmentId: number,
): VerifiedActor {
  if (actor.role === "system_admin") {
    return actor;
  }

  if (actor.role !== "department_admin" || actor.departmentId !== departmentId) {
    throw new ApiError("FORBIDDEN", "You do not have access to this department", 403);
  }

  return actor;
}
