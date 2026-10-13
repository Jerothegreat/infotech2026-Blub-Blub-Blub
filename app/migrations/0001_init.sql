CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'department_admin', 'system_admin')),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  created_at TEXT NOT NULL
);

CREATE INDEX users_department_id_idx ON users (department_id);

CREATE TABLE uploads (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  uploaded_at TEXT NOT NULL
);
