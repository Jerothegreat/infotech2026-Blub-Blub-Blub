import { ApiError } from "./http/errors";

export type AnnouncementType = "banner" | "reminder";
export type AnnouncementStatus = "draft" | "published" | "archived";

export type AnnouncementActor = {
  id: number;
  role: "department_admin" | "system_admin" | "student";
  departmentId: number;
};

export type AnnouncementInput = {
  type?: AnnouncementType;
  title?: unknown;
  body?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  status?: AnnouncementStatus;
  audienceDepartmentIds?: unknown;
};

export type Announcement = {
  id: number;
  type: AnnouncementType;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string | null;
  status: AnnouncementStatus;
  createdAt: string;
  audienceDepartmentIds: number[];
};

type SqliteDatabase = {
  all<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  get<T>(sql: string, ...params: unknown[]): Promise<T | undefined>;
  run(sql: string, ...params: unknown[]): Promise<{ lastID?: number }>;
};

type AnnouncementRow = {
  id: number;
  type: AnnouncementType;
  title: string;
  body: string;
  starts_at: string;
  ends_at: string | null;
  status: AnnouncementStatus;
  created_at: string;
  department_id?: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export function validateAnnouncementInput(
  input: AnnouncementInput,
  actor: AnnouncementActor,
): Required<Pick<AnnouncementInput, "type" | "title" | "body" | "startsAt">> & {
  endsAt: string | null;
  status: AnnouncementStatus;
  audienceDepartmentIds: number[];
} {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const startsAt = typeof input.startsAt === "string" ? input.startsAt : "";
  const endsAt = input.endsAt == null || input.endsAt === "" ? null : input.endsAt;
  const type = input.type ?? "banner";
  const status = input.status ?? "published";

  if (!title) throw new ApiError("INVALID_INPUT", "Title is required", 400);
  if (!body) throw new ApiError("INVALID_INPUT", "Body is required", 400);
  if (!isValidDate(startsAt)) {
    throw new ApiError("INVALID_INPUT", "startsAt must be a valid ISO date", 400);
  }
  if (endsAt !== null && (typeof endsAt !== "string" || !isValidDate(endsAt))) {
    throw new ApiError("INVALID_INPUT", "endsAt must be a valid ISO date", 400);
  }
  if (endsAt !== null && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    throw new ApiError("INVALID_INPUT", "endsAt must be after startsAt", 400);
  }
  if (!["banner", "reminder"].includes(type)) {
    throw new ApiError("INVALID_INPUT", "Invalid announcement type", 400);
  }
  if (!["draft", "published"].includes(status)) {
    throw new ApiError("INVALID_INPUT", "Invalid announcement status", 400);
  }

  const audienceDepartmentIds = parseAudience(input.audienceDepartmentIds);
  if (audienceDepartmentIds.length === 0) {
    throw new ApiError("INVALID_INPUT", "At least one audience department is required", 400);
  }
  if (actor.role === "department_admin" && audienceDepartmentIds.some((id) => id !== actor.departmentId)) {
    throw new ApiError("FORBIDDEN", "Department admins can only publish to their department", 403);
  }

  return { type, title, body, startsAt, endsAt, status, audienceDepartmentIds };
}

function isValidDate(value: string): boolean {
  return ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime());
}

function parseAudience(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is number => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

function mapAnnouncement(rows: AnnouncementRow[]): Announcement {
  const first = rows[0];
  if (!first) throw new ApiError("NOT_FOUND", "Announcement not found", 404);
  return {
    id: first.id,
    type: first.type,
    title: first.title,
    body: first.body,
    startsAt: first.starts_at,
    endsAt: first.ends_at,
    status: first.status,
    createdAt: first.created_at,
    audienceDepartmentIds: rows.flatMap((row) =>
      row.department_id == null ? [] : [row.department_id],
    ),
  };
}

async function loadAnnouncement(db: SqliteDatabase, id: number): Promise<Announcement> {
  const rows = await db.all<AnnouncementRow>(
    `SELECT a.id, a.type, a.title, a.body, a.starts_at, a.ends_at, a.status,
            a.created_at, aa.department_id
       FROM announcements a
       LEFT JOIN announcement_audiences aa ON aa.announcement_id = a.id
      WHERE a.id = ?
      ORDER BY aa.department_id`,
    id,
  );
  return mapAnnouncement(rows);
}

function assertCanAccess(actor: AnnouncementActor, announcement: Announcement): void {
  if (
    actor.role === "department_admin" &&
    !announcement.audienceDepartmentIds.includes(actor.departmentId)
  ) {
    throw new ApiError("FORBIDDEN", "Announcement is outside your department", 403);
  }
}

export function requireAnnouncementAdmin(actor: AnnouncementActor): void {
  if (actor.role !== "department_admin" && actor.role !== "system_admin") {
    throw new ApiError("FORBIDDEN", "You do not have permission for publishing", 403);
  }
}

async function assertAudienceDepartmentsExist(
  db: SqliteDatabase,
  departmentIds: number[],
): Promise<void> {
  for (const departmentId of departmentIds) {
    const department = await db.get<{ id: number }>(
      "SELECT id FROM departments WHERE id = ?",
      departmentId,
    );
    if (!department) {
      throw new ApiError("INVALID_INPUT", `Unknown audience department: ${departmentId}`, 400);
    }
  }
}

export async function listAnnouncements(
  db: SqliteDatabase,
  actor: AnnouncementActor,
): Promise<Announcement[]> {
  requireAnnouncementAdmin(actor);
  const rows = await db.all<AnnouncementRow>(
    `SELECT a.id, a.type, a.title, a.body, a.starts_at, a.ends_at, a.status,
            a.created_at, aa.department_id
       FROM announcements a
       JOIN announcement_audiences aa ON aa.announcement_id = a.id
      WHERE (? = 'system_admin' OR aa.department_id = ?)
      ORDER BY a.starts_at DESC, a.id DESC`,
    actor.role,
    actor.departmentId,
  );
  const grouped = new Map<number, AnnouncementRow[]>();
  for (const row of rows) grouped.set(row.id, [...(grouped.get(row.id) ?? []), row]);
  return [...grouped.values()].map(mapAnnouncement);
}

export async function getAnnouncement(
  db: SqliteDatabase,
  actor: AnnouncementActor,
  id: number,
): Promise<Announcement> {
  requireAnnouncementAdmin(actor);
  const announcement = await loadAnnouncement(db, id);
  assertCanAccess(actor, announcement);
  return announcement;
}

export async function createAnnouncement(
  db: SqliteDatabase,
  actor: AnnouncementActor,
  input: AnnouncementInput,
): Promise<Announcement> {
  requireAnnouncementAdmin(actor);
  const value = validateAnnouncementInput(input, actor);
  await assertAudienceDepartmentsExist(db, value.audienceDepartmentIds);
  const createdAt = new Date().toISOString();
  const result = await db.run(
    `INSERT INTO announcements
       (created_by_user_id, type, title, body, starts_at, ends_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    actor.id,
    value.type,
    value.title,
    value.body,
    value.startsAt,
    value.endsAt,
    value.status,
    createdAt,
  );
  const id = result.lastID;
  if (!id) throw new ApiError("INTERNAL_ERROR", "Unable to create announcement", 500);
  for (const departmentId of value.audienceDepartmentIds) {
    await db.run(
      "INSERT INTO announcement_audiences (announcement_id, department_id) VALUES (?, ?)",
      id,
      departmentId,
    );
  }
  return getAnnouncement(db, actor, id);
}

export async function updateAnnouncement(
  db: SqliteDatabase,
  actor: AnnouncementActor,
  id: number,
  input: AnnouncementInput,
): Promise<Announcement> {
  requireAnnouncementAdmin(actor);
  const current = await getAnnouncement(db, actor, id);
  const value = validateAnnouncementInput(
    {
      type: input.type ?? current.type,
      title: input.title ?? current.title,
      body: input.body ?? current.body,
      startsAt: input.startsAt ?? current.startsAt,
      endsAt: input.endsAt === undefined ? current.endsAt : input.endsAt,
      status: input.status ?? current.status,
      audienceDepartmentIds:
        input.audienceDepartmentIds ?? current.audienceDepartmentIds,
    },
    actor,
  );
  await assertAudienceDepartmentsExist(db, value.audienceDepartmentIds);
  await db.run(
    `UPDATE announcements
        SET type = ?, title = ?, body = ?, starts_at = ?, ends_at = ?, status = ?
      WHERE id = ?`,
    value.type,
    value.title,
    value.body,
    value.startsAt,
    value.endsAt,
    value.status,
    id,
  );
  await db.run("DELETE FROM announcement_audiences WHERE announcement_id = ?", id);
  for (const departmentId of value.audienceDepartmentIds) {
    await db.run(
      "INSERT INTO announcement_audiences (announcement_id, department_id) VALUES (?, ?)",
      id,
      departmentId,
    );
  }
  return getAnnouncement(db, actor, id);
}

export async function archiveAnnouncement(
  db: SqliteDatabase,
  actor: AnnouncementActor,
  id: number,
): Promise<Announcement> {
  requireAnnouncementAdmin(actor);
  await getAnnouncement(db, actor, id);
  await db.run("UPDATE announcements SET status = 'archived' WHERE id = ?", id);
  return getAnnouncement(db, actor, id);
}
