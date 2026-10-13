import {
  createTenant,
  listTenants,
  requireSystemAdmin,
  SystemAdminError,
  type SqlDatabase,
  type VerifiedSystemActor,
} from "@/lib/system-admin";
import { openDatabase } from "@/lib/db";
import { requireRole, requireVerifiedActor } from "@/lib/auth/actor";
import { ApiError, errorResponse as foundationErrorResponse, toApiError } from "@/lib/http/errors";

export type SystemRouteContext = { database: SqlDatabase; actor: VerifiedSystemActor; close?: () => Promise<void> };
export type SystemContextProvider = (request: Request) => Promise<SystemRouteContext>;

function errorResponse(error: unknown): Response {
  if (error instanceof SystemAdminError) {
    const code = error.code === "CONFLICT" ? "INVALID_INPUT" : error.code;
    return foundationErrorResponse(new ApiError(code, error.message, error.status));
  }
  return foundationErrorResponse(toApiError(error));
}

async function body(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SystemAdminError("INVALID_INPUT", "Request body must be valid JSON", 400);
  }
}

export function createTenantHandlers(getContext: SystemContextProvider) {
  return {
    GET: async (request: Request) => {
      let context: SystemRouteContext | undefined;
      try { context = await getContext(request); requireSystemAdmin(context.actor); return Response.json({ tenants: await listTenants(context.database) }); }
      catch (error) { return errorResponse(error); } finally { await context?.close?.(); }
    },
    POST: async (request: Request) => {
      let context: SystemRouteContext | undefined;
      try { context = await getContext(request); requireSystemAdmin(context.actor); return Response.json({ tenant: await createTenant(context.database, await body(request)) }, { status: 201 }); }
      catch (error) { return errorResponse(error); } finally { await context?.close?.(); }
    },
  };
}

export async function GET(request: Request) { return createTenantHandlers(getSystemContext).GET(request); }
export async function POST(request: Request) { return createTenantHandlers(getSystemContext).POST(request); }

export async function getSystemContext(request: Request): Promise<SystemRouteContext> {
  const actor = await requireVerifiedActor(request);
  requireRole(actor, "system_admin");
  const database = await openDatabase();
  return { database, actor, close: () => database.close() };
}
