CREATE TABLE department_admin_assignments (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  assigned_at TEXT NOT NULL
);

CREATE TRIGGER department_admin_assignments_role_insert
BEFORE INSERT ON department_admin_assignments
FOR EACH ROW
WHEN (SELECT role FROM users WHERE users.id = NEW.user_id) <> 'department_admin'
BEGIN
  SELECT RAISE(ABORT, 'only department admins may be assigned');
END;

CREATE TRIGGER department_admin_assignments_role_update
BEFORE UPDATE OF user_id ON department_admin_assignments
FOR EACH ROW
WHEN (SELECT role FROM users WHERE users.id = NEW.user_id) <> 'department_admin'
BEGIN
  SELECT RAISE(ABORT, 'only department admins may be assigned');
END;

CREATE TRIGGER users_role_assignment_guard
BEFORE UPDATE OF role ON users
FOR EACH ROW
WHEN NEW.role <> 'department_admin'
  AND EXISTS (SELECT 1 FROM department_admin_assignments WHERE user_id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'remove department admin assignment before changing role');
END;

CREATE INDEX department_admin_assignments_department_id_idx
  ON department_admin_assignments (department_id);
