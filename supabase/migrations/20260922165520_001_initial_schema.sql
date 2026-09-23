/*
# Parents Attendance — Initial Schema

## Overview
Creates the full database for a parent attendance tracking system with:
- Key stages and grades (managed by admin)
- Students (belonging to a grade)
- Parents (mother/father/guardian, belonging to a student)
- Attendance records (submitted by parents via the public form)
- Form settings (admin-controlled open/close times)

## Tables
1. `key_stages` — Groups grades into key stages (e.g. KS1, KS2)
2. `grades` — Individual grades, each belonging to a key stage
3. `students` — Students, each belonging to a grade
4. `parents` — Parents/guardians for each student (type: mother/father/guardian)
5. `attendance` — Attendance records submitted via the public form
6. `form_settings` — Single-row table controlling form open/close times

## Security
- RLS enabled on all tables.
- Public (anon) can read key_stages, grades, students, parents (needed for form dropdowns).
- Public (anon) can INSERT attendance records (the public form).
- All other operations (update, delete, insert on config tables) require authenticated (admin).
- `form_settings` is readable by anon (so the form knows if it's open) but only editable by authenticated.
*/

-- ============================================================
-- KEY STAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS key_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE key_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ks_select_public" ON key_stages;
CREATE POLICY "ks_select_public" ON key_stages
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ks_insert_admin" ON key_stages;
CREATE POLICY "ks_insert_admin" ON key_stages
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ks_update_admin" ON key_stages;
CREATE POLICY "ks_update_admin" ON key_stages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ks_delete_admin" ON key_stages;
CREATE POLICY "ks_delete_admin" ON key_stages
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- GRADES
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_stage_id uuid REFERENCES key_stages(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gr_select_public" ON grades;
CREATE POLICY "gr_select_public" ON grades
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "gr_insert_admin" ON grades;
CREATE POLICY "gr_insert_admin" ON grades
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "gr_update_admin" ON grades;
CREATE POLICY "gr_update_admin" ON grades
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "gr_delete_admin" ON grades;
CREATE POLICY "gr_delete_admin" ON grades
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  grade_id uuid REFERENCES grades(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "st_select_public" ON students;
CREATE POLICY "st_select_public" ON students
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "st_insert_admin" ON students;
CREATE POLICY "st_insert_admin" ON students
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "st_update_admin" ON students;
CREATE POLICY "st_update_admin" ON students
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "st_delete_admin" ON students;
CREATE POLICY "st_delete_admin" ON students
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_students_grade_id ON students(grade_id);

-- ============================================================
-- PARENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('mother','father','guardian')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pa_select_public" ON parents;
CREATE POLICY "pa_select_public" ON parents
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pa_insert_admin" ON parents;
CREATE POLICY "pa_insert_admin" ON parents
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pa_update_admin" ON parents;
CREATE POLICY "pa_update_admin" ON parents
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pa_delete_admin" ON parents;
CREATE POLICY "pa_delete_admin" ON parents
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_parents_student_id ON parents(student_id);

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  grade_id uuid REFERENCES grades(id) ON DELETE CASCADE,
  mother_attended boolean NOT NULL DEFAULT false,
  father_attended boolean NOT NULL DEFAULT false,
  guardian_name text,
  guardian_attended boolean NOT NULL DEFAULT false,
  attendee_name text,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_student_date_unique UNIQUE (student_id, attendance_date)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "att_select_public" ON attendance;
CREATE POLICY "att_select_public" ON attendance
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "att_insert_public" ON attendance;
CREATE POLICY "att_insert_public" ON attendance
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "att_update_admin" ON attendance;
CREATE POLICY "att_update_admin" ON attendance
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "att_delete_admin" ON attendance;
CREATE POLICY "att_delete_admin" ON attendance
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_attendance_grade_id ON attendance(grade_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);

-- ============================================================
-- FORM SETTINGS (single row)
-- ============================================================
CREATE TABLE IF NOT EXISTS form_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_open boolean NOT NULL DEFAULT false,
  open_time timestamptz,
  close_time timestamptz,
  manual_override boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE form_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fs_select_public" ON form_settings;
CREATE POLICY "fs_select_public" ON form_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "fs_insert_admin" ON form_settings;
CREATE POLICY "fs_insert_admin" ON form_settings
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fs_update_admin" ON form_settings;
CREATE POLICY "fs_update_admin" ON form_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fs_delete_admin" ON form_settings;
CREATE POLICY "fs_delete_admin" ON form_settings
  FOR DELETE TO authenticated USING (true);

-- Insert default settings row
INSERT INTO form_settings (is_open, manual_override)
VALUES (false, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Trigger: auto-update updated_at on form_settings
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_settings_updated_at ON form_settings;
CREATE TRIGGER trg_form_settings_updated_at
  BEFORE UPDATE ON form_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- View: attendance_with_details
-- Joins attendance with student, grade, key_stage for easy querying
-- ============================================================
CREATE OR REPLACE VIEW attendance_with_details AS
SELECT
  a.id,
  a.student_id,
  a.grade_id,
  s.name AS student_name,
  g.name AS grade_name,
  ks.id AS key_stage_id,
  ks.name AS key_stage_name,
  a.mother_attended,
  a.father_attended,
  a.guardian_name,
  a.guardian_attended,
  a.attendee_name,
  a.attendance_date,
  a.created_at
FROM attendance a
JOIN students s ON a.student_id = s.id
LEFT JOIN grades g ON a.grade_id = g.id
LEFT JOIN key_stages ks ON g.key_stage_id = ks.id;

ALTER VIEW attendance_with_details SET (security_barrier = true);
