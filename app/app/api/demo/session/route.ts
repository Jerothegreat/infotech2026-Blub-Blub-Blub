import { NextResponse } from "next/server";
import {
  createDemoSession,
  deleteDemoSession,
  DEMO_SESSION_COOKIE,
  getDemoAccount,
  getDemoSessionActor,
} from "@/lib/auth/demo-session";
import { openDatabase } from "@/lib/db";
import { ApiError, errorResponse, toApiError } from "@/lib/http/errors";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const account = getDemoAccount(email, password);
    if (!account) {
      throw new ApiError("FORBIDDEN", "The email or password is not recognized.", 403);
    }
    const database = await openDatabase();
    try {
      const session = await createDemoSession(database, account);
      const response = NextResponse.json({ departmentId: session.departmentId, role: account.role });
      response.cookies.set(DEMO_SESSION_COOKIE, session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        expires: session.expiresAt,
        path: "/",
      });
      return response;
    } finally {
      await database.close();
    }
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function GET(request: Request) {
  try {
    const actor = await getDemoSessionActor(request);
    if (!actor) {
      throw new ApiError("FORBIDDEN", "A verified actor is required", 403);
    }
    return NextResponse.json({ departmentId: actor.departmentId, role: actor.role });
  } catch (error) {
    return errorResponse(toApiError(error));
  }
}

export async function DELETE(request: Request) {
  await deleteDemoSession(request);
  const response = new Response(null, { status: 204 });
  response.headers.set("Set-Cookie", `${DEMO_SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
