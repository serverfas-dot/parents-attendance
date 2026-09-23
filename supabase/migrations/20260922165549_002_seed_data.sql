/*
# Seed Data — Sample Key Stages, Grades, Students, and Parents

Adds sample data so the app is functional immediately:
- 3 Key Stages (KS1, KS2, KS3)
- 6 Grades (2 per key stage)
- Sample students with mothers and fathers
*/

INSERT INTO key_stages (name)
SELECT 'Key Stage 1'
WHERE NOT EXISTS (SELECT 1 FROM key_stages WHERE name = 'Key Stage 1');

INSERT INTO key_stages (name)
SELECT 'Key Stage 2'
WHERE NOT EXISTS (SELECT 1 FROM key_stages WHERE name = 'Key Stage 2');

INSERT INTO key_stages (name)
SELECT 'Key Stage 3'
WHERE NOT EXISTS (SELECT 1 FROM key_stages WHERE name = 'Key Stage 3');

-- Grades for KS1
INSERT INTO grades (name, key_stage_id)
SELECT 'Grade 1', id FROM key_stages WHERE name = 'Key Stage 1'
AND NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Grade 1');

INSERT INTO grades (name, key_stage_id)
SELECT 'Grade 2', id FROM key_stages WHERE name = 'Key Stage 1'
AND NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Grade 2');

-- Grades for KS2
INSERT INTO grades (name, key_stage_id)
SELECT 'Grade 3', id FROM key_stages WHERE name = 'Key Stage 2'
AND NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Grade 3');

INSERT INTO grades (name, key_stage_id)
SELECT 'Grade 4', id FROM key_stages WHERE name = 'Key Stage 2'
AND NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Grade 4');

-- Grades for KS3
INSERT INTO grades (name, key_stage_id)
SELECT 'Grade 5', id FROM key_stages WHERE name = 'Key Stage 3'
AND NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Grade 5');

INSERT INTO grades (name, key_stage_id)
SELECT 'Grade 6', id FROM key_stages WHERE name = 'Key Stage 3'
AND NOT EXISTS (SELECT 1 FROM grades WHERE name = 'Grade 6');

-- Sample students for Grade 1
INSERT INTO students (name, grade_id)
SELECT 'Alice Johnson', id FROM grades WHERE name = 'Grade 1'
AND NOT EXISTS (SELECT 1 FROM students WHERE name = 'Alice Johnson');

INSERT INTO students (name, grade_id)
SELECT 'Bob Smith', id FROM grades WHERE name = 'Grade 1'
AND NOT EXISTS (SELECT 1 FROM students WHERE name = 'Bob Smith');

-- Sample students for Grade 3
INSERT INTO students (name, grade_id)
SELECT 'Charlie Brown', id FROM grades WHERE name = 'Grade 3'
AND NOT EXISTS (SELECT 1 FROM students WHERE name = 'Charlie Brown');

INSERT INTO students (name, grade_id)
SELECT 'Diana Prince', id FROM grades WHERE name = 'Grade 3'
AND NOT EXISTS (SELECT 1 FROM students WHERE name = 'Diana Prince');

-- Parents for Alice Johnson
INSERT INTO parents (student_id, name, type)
SELECT s.id, 'Sarah Johnson', 'mother' FROM students s WHERE s.name = 'Alice Johnson'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'mother');

INSERT INTO parents (student_id, name, type)
SELECT s.id, 'Michael Johnson', 'father' FROM students s WHERE s.name = 'Alice Johnson'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'father');

-- Parents for Bob Smith
INSERT INTO parents (student_id, name, type)
SELECT s.id, 'Emily Smith', 'mother' FROM students s WHERE s.name = 'Bob Smith'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'mother');

INSERT INTO parents (student_id, name, type)
SELECT s.id, 'David Smith', 'father' FROM students s WHERE s.name = 'Bob Smith'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'father');

-- Parents for Charlie Brown
INSERT INTO parents (student_id, name, type)
SELECT s.id, 'Laura Brown', 'mother' FROM students s WHERE s.name = 'Charlie Brown'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'mother');

INSERT INTO parents (student_id, name, type)
SELECT s.id, 'James Brown', 'father' FROM students s WHERE s.name = 'Charlie Brown'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'father');

-- Parents for Diana Prince (only mother, no father)
INSERT INTO parents (student_id, name, type)
SELECT s.id, 'Hippolyta Prince', 'mother' FROM students s WHERE s.name = 'Diana Prince'
AND NOT EXISTS (SELECT 1 FROM parents p WHERE p.student_id = s.id AND p.type = 'mother');
