import { openDatabase } from "@/lib/db";
import { requireVerifiedActor } from "@/lib/auth/actor";
import { errorResponse, toApiError, ApiError } from "@/lib/http/errors";
import { replaceSource, retireSource } from "@/lib/sources";

function sourceId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ApiError("INVALID_INPUT", "Invalid source id", 400);
  return id;
}

async function replacement(request: Request, params: Promise<{ sourceId: string }>) {
  const actor = await requireVerifiedActor(request);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError("INVALID_INPUT", "A non-empty file is required", 400);
  }
  const database = await openDatabase();
  try {
    const result = await replaceSource(database, actor, sourceId((await params).sourceId), file);
    return Response.json(result);
  } finally {
    await database.close();
  }
}

export async function PUT(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  try {
    return await replacement(request, context.params);
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  try {
    return await replacement(request, context.params);
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ sourceId: string }> }) {
  try {
    const actor = await requireVerifiedActor(request);
    const database = await openDatabase();
    try {
      await retireSource(database, actor, sourceId((await context.params).sourceId));
      return new Response(null, { status: 204 });
    } finally {
      await database.close();
    }
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
