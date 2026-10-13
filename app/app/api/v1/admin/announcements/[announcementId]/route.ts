import { NextResponse } from "next/server";
import { openDatabase } from "@/lib/db";
import {
  archiveAnnouncement,
  getAnnouncement,
  updateAnnouncement,
  type AnnouncementActor,
} from "@/lib/announcements";
import { requireVerifiedActor } from "@/lib/auth/actor";
import { ApiError, errorResponse, toApiError } from "@/lib/http/errors";

async function withDatabase<T>(operation: (database: Awaited<ReturnType<typeof openDatabase>>) => Promise<T>) {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    await database.close();
  }
}

async function announcementId(params: Promise<{ announcementId: string }>): Promise<number> {
  const value = Number((await params).announcementId);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError("INVALID_INPUT", "Invalid announcement id", 400);
  }
  return value;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ announcementId: string }> },
) {
  try {
    const actor = await requireVerifiedActor(request);
    const id = await announcementId(params);
    const announcement = await withDatabase((database) =>
      getAnnouncement(database, actor as AnnouncementActor, id),
    );
    return NextResponse.json({ announcement });
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ announcementId: string }> },
) {
  try {
    const actor = await requireVerifiedActor(request);
    const id = await announcementId(params);
    const announcement = await withDatabase(async (database) =>
      updateAnnouncement(database, actor as AnnouncementActor, id, await request.json()),
    );
    return NextResponse.json({ announcement });
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ announcementId: string }> },
) {
  try {
    const actor = await requireVerifiedActor(request);
    const id = await announcementId(params);
    const announcement = await withDatabase((database) =>
      archiveAnnouncement(database, actor as AnnouncementActor, id),
    );
    return NextResponse.json({ announcement });
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
