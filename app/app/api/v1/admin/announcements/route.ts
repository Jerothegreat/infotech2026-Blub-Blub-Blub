import { NextResponse } from "next/server";
import { openDatabase } from "@/lib/db";
import {
  createAnnouncement,
  listAnnouncements,
  type AnnouncementActor,
} from "@/lib/announcements";
import { requireVerifiedActor } from "@/lib/auth/actor";
import { errorResponse, toApiError } from "@/lib/http/errors";

async function withDatabase<T>(operation: (database: Awaited<ReturnType<typeof openDatabase>>) => Promise<T>) {
  const database = await openDatabase();
  try {
    return await operation(database);
  } finally {
    await database.close();
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireVerifiedActor(request);
    const announcements = await withDatabase((database) =>
      listAnnouncements(database, actor as AnnouncementActor),
    );
    return NextResponse.json({ announcements });
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireVerifiedActor(request);
    const input = await request.json();
    const announcement = await withDatabase((database) =>
      createAnnouncement(database, actor as AnnouncementActor, input),
    );
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}
