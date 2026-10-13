import { getTenant, requireSystemAdmin, SystemAdminError, updateTenant } from "@/lib/system-admin";
import { getSystemContext, type SystemContextProvider } from "../route";
import { errorResponse as foundationErrorResponse, toApiError, ApiError } from "@/lib/http/errors";

type Params = { params: Promise<{ tenantId: string }> };
function errorResponse(error: unknown): Response { if (error instanceof SystemAdminError) return foundationErrorResponse(new ApiError(error.code === "CONFLICT" ? "INVALID_INPUT" : error.code, error.message, error.status)); return foundationErrorResponse(toApiError(error)); }
function id(value: string): number { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 1) throw new SystemAdminError("INVALID_INPUT", "tenantId must be a positive integer", 400); return parsed; }
async function body(request: Request): Promise<unknown> { try { return await request.json(); } catch { throw new SystemAdminError("INVALID_INPUT", "Request body must be valid JSON", 400); } }

export function createTenantDetailHandlers(getContext: SystemContextProvider) {
  return {
    GET: async (request: Request, context: Params) => { let systemContext; try { systemContext = await getContext(request); requireSystemAdmin(systemContext.actor); return Response.json({ tenant: await getTenant(systemContext.database, id((await context.params).tenantId)) }); } catch (error) { return errorResponse(error); } finally { await systemContext?.close?.(); } },
    PATCH: async (request: Request, context: Params) => { let systemContext; try { systemContext = await getContext(request); requireSystemAdmin(systemContext.actor); return Response.json({ tenant: await updateTenant(systemContext.database, id((await context.params).tenantId), await body(request)) }); } catch (error) { return errorResponse(error); } finally { await systemContext?.close?.(); } },
  };
}

export async function GET(request: Request, context: Params) { return createTenantDetailHandlers(getSystemContext).GET(request, context); }
export async function PATCH(request: Request, context: Params) { return createTenantDetailHandlers(getSystemContext).PATCH(request, context); }
