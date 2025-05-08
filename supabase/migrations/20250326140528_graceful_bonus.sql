/*
  # Insert Sample Data with Proper Type Handling

  1. Changes
    - Insert sample students with conflict handling
    - Insert detention slots with proper UUID casting
    - Insert sample violations with proper references
    - Handle all potential conflicts

  2. Notes
    - Uses proper type casting for UUIDs
    - Handles conflicts appropriately
    - Maintains data integrity
*/

-- Insert sample students with conflict handling
INSERT INTO students (barcode, name, email, grade) VALUES
  ('123456', 'Emma Martinez', 'martinez.emma@student.tmechs.edu', 9),
  ('234567', 'Liam Johnson', 'johnson.liam@student.tmechs.edu', 10),
  ('345678', 'Olivia Williams', 'williams.olivia@student.tmechs.edu', 11),
  ('456789', 'Noah Brown', 'brown.noah@student.tmechs.edu', 12),
  ('567890', 'Ava Davis', 'davis.ava@student.tmechs.edu', 9),
  ('678901', 'Mason Garcia', 'garcia.mason@student.tmechs.edu', 10),
  ('789012', 'Sophia Rodriguez', 'rodriguez.sophia@student.tmechs.edu', 11),
  ('890123', 'Lucas Wilson', 'wilson.lucas@student.tmechs.edu', 12),
  ('901234', 'Isabella Taylor', 'taylor.isabella@student.tmechs.edu', 9),
  ('012345', 'Ethan Thomas', 'thomas.ethan@student.tmechs.edu', 10)
ON CONFLICT (barcode) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  grade = EXCLUDED.grade;

-- Insert some sample detention slots for the next two weeks
WITH new_slots AS (
  SELECT 
    CURRENT_DATE + (n || ' days')::interval AS date,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid AS teacher_id,
    20 AS capacity
  FROM generate_series(1, 14) n
  WHERE EXTRACT(DOW FROM CURRENT_DATE + (n || ' days')::interval) NOT IN (0, 6) -- Exclude weekends
)
INSERT INTO detention_slots (date, teacher_id, capacity)
SELECT date, teacher_id, capacity
FROM new_slots
ON CONFLICT DO NOTHING;

-- Insert some sample violations with conflict handling
WITH sample_violations AS (
  SELECT 
    s.id AS student_id,
    violation_type,
    ds.date AS detention_date,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid AS teacher_id
  FROM 
    students s
    CROSS JOIN (
      SELECT unnest(ARRAY['No ID', 'Improper Phone Use', 'Tardy', 'Disrespectful Behavior']) as violation_type
    ) v
    CROSS JOIN (
      SELECT date 
      FROM detention_slots 
      ORDER BY date 
      LIMIT 3
    ) ds
  LIMIT 5
)
INSERT INTO violations (student_id, violation_type, detention_date, teacher_id)
SELECT student_id, violation_type, detention_date, teacher_id
FROM sample_violations
ON CONFLICT DO NOTHING;