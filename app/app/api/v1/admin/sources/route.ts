import { openDatabase } from "@/lib/db";
import { requireVerifiedActor } from "@/lib/auth/actor";
import { errorResponse, toApiError, ApiError } from "@/lib/http/errors";
import { createSource, listSources } from "@/lib/sources";

export async function GET(request: Request) {
  try {
    const actor = await requireVerifiedActor(request);
    const database = await openDatabase();
    try {
      return Response.json({ sources: await listSources(database, actor) });
    } finally {
      await database.close();
    }
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

function requiredFile(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError("INVALID_INPUT", "A non-empty file is required", 400);
  }
  return file;
}

function requiredTitle(form: FormData) {
  const title = form.get("title");
  if (typeof title !== "string" || !title.trim()) {
    throw new ApiError("INVALID_INPUT", "Title is required", 400);
  }
  return title.trim();
}

export async function POST(request: Request) {
  try {
    const actor = await requireVerifiedActor(request);
    const form = await request.formData();
    const title = requiredTitle(form);
    const file = requiredFile(form);
    const requestedDepartment = form.get("departmentId");
    const departmentId =
      typeof requestedDepartment === "string" && requestedDepartment.trim()
        ? Number(requestedDepartment)
        : undefined;
    if (departmentId !== undefined && (!Number.isInteger(departmentId) || departmentId < 1)) {
      throw new ApiError("INVALID_INPUT", "Invalid department id", 400);
    }
    const database = await openDatabase();
    try {
      const registration = await createSource(database, actor, title, file, departmentId);
      return Response.json(registration, { status: 201 });
    } finally {
      await database.close();
    }
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
