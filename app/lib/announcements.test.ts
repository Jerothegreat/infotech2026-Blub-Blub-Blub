import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createAnnouncement,
  getAnnouncement,
  validateAnnouncementInput,
  type AnnouncementActor,
} from "./announcements";

const departmentAdmin: AnnouncementActor = {
  id: 7,
  role: "department_admin",
  departmentId: 12,
};

const validInput = {
  title: "Enrollment help",
  body: "Visit the registrar this week.",
  startsAt: "2026-10-20T09:00:00Z",
  endsAt: "2026-10-27T09:00:00Z",
  audienceDepartmentIds: [12],
};

function fakeDatabase(): Parameters<typeof createAnnouncement>[0] {
  const rows = [
    {
      id: 4,
      type: "banner" as const,
      title: validInput.title,
      body: validInput.body,
      starts_at: validInput.startsAt,
      ends_at: validInput.endsAt,
      status: "published" as const,
      created_at: "2026-10-13T00:00:00.000Z",
      department_id: 12,
    },
  ];
  return {
    all: async () => rows,
    get: async <T>() => ({ id: 12 } as T),
    run: async () => ({ lastID: 4 }),
  } as Parameters<typeof createAnnouncement>[0];
}

describe("announcement publishing", () => {
  it("rejects blank content and invalid schedules", () => {
    assert.throws(
      () => validateAnnouncementInput({ ...validInput, title: "   " }, departmentAdmin),
      { code: "INVALID_INPUT", status: 400 },
    );
    assert.throws(
      () =>
        validateAnnouncementInput(
          { ...validInput, endsAt: "2026-10-19T09:00:00Z" },
          departmentAdmin,
        ),
      { code: "INVALID_INPUT", status: 400 },
    );
  });

  it("denies a department admin audience outside its tenant", () => {
    assert.throws(
      () => validateAnnouncementInput({ ...validInput, audienceDepartmentIds: [99] }, departmentAdmin),
      { code: "FORBIDDEN", status: 403 },
    );
  });

  it("creates and reads the stable announcement contract", async () => {
    const announcement = await createAnnouncement(fakeDatabase(), departmentAdmin, validInput);
    assert.deepEqual(announcement, {
      id: 4,
      type: "banner",
      title: "Enrollment help",
      body: "Visit the registrar this week.",
      startsAt: "2026-10-20T09:00:00Z",
      endsAt: "2026-10-27T09:00:00Z",
      status: "published",
      createdAt: "2026-10-13T00:00:00.000Z",
      audienceDepartmentIds: [12],
    });
  });

  it("denies cross-tenant reads", async () => {
    await assert.rejects(
      getAnnouncement(fakeDatabase(), { ...departmentAdmin, departmentId: 99 }, 4),
      { code: "FORBIDDEN", status: 403 },
    );
  });
});
