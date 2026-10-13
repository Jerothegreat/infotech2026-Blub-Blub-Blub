import { createUser, listUsers, requireSystemAdmin, SystemAdminError } from "@/lib/system-admin";
import type { SystemContextProvider } from "../tenants/route";
import { getSystemContext } from "../tenants/route";
import { ApiError, errorResponse as foundationErrorResponse, toApiError } from "@/lib/http/errors";

export type { SystemContextProvider } from "../tenants/route";

function errorResponse(error: unknown): Response { if (error instanceof SystemAdminError) return foundationErrorResponse(new ApiError(error.code === "CONFLICT" ? "INVALID_INPUT" : error.code, error.message, error.status)); return foundationErrorResponse(toApiError(error)); }
async function body(request: Request): Promise<unknown> { try { return await request.json(); } catch { throw new SystemAdminError("INVALID_INPUT", "Request body must be valid JSON", 400); } }
export function createUserHandlers(getContext: SystemContextProvider) { return { GET: async (request: Request) => { let context; try { context = await getContext(request); requireSystemAdmin(context.actor); return Response.json({ users: await listUsers(context.database) }); } catch (error) { return errorResponse(error); } finally { await context?.close?.(); } }, POST: async (request: Request) => { let context; try { context = await getContext(request); requireSystemAdmin(context.actor); return Response.json({ user: await createUser(context.database, await body(request)) }, { status: 201 }); } catch (error) { return errorResponse(error); } finally { await context?.close?.(); } } }; }
export async function GET(request: Request) { return createUserHandlers(getSystemContext).GET(request); }
export async function POST(request: Request) { return createUserHandlers(getSystemContext).POST(request); }
