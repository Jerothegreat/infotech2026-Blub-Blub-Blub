CREATE TABLE announcements (
  id INTEGER PRIMARY KEY,
  created_by_user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('banner', 'reminder', 'seasonal_campaign')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL,
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX announcements_created_by_user_id_idx ON announcements (created_by_user_id);

CREATE TABLE announcement_audiences (
  announcement_id INTEGER NOT NULL REFERENCES announcements(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  PRIMARY KEY (announcement_id, department_id)
);

CREATE INDEX announcement_audiences_department_id_idx ON announcement_audiences (department_id);
