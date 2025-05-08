/*
  # Insert Sample Data

  1. Sample Data
    - Add one teacher account for testing
    - Add 10 sample students with realistic data
    - Ensure unique barcodes and email addresses

  2. Notes
    - Teacher password will be 'password123' (for testing only)
    - Student IDs are 6-digit numbers
    - Emails follow a consistent format
*/

-- Insert sample teacher (password: password123)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'smith.john@tmechs.edu',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
);

INSERT INTO teachers (id, name, email)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'John Smith',
  'smith.john@tmechs.edu'
);

-- Insert sample students
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
  ('012345', 'Ethan Thomas', 'thomas.ethan@student.tmechs.edu', 10);

-- Insert some sample detention slots for the next two weeks
INSERT INTO detention_slots (date, teacher_id, capacity)
SELECT 
  CURRENT_DATE + (n || ' days')::interval,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  20
FROM generate_series(1, 14) n
WHERE EXTRACT(DOW FROM CURRENT_DATE + (n || ' days')::interval) NOT IN (0, 6); -- Exclude weekends

-- Insert some sample violations
INSERT INTO violations (student_id, violation_type, detention_date, teacher_id)
SELECT 
  s.id,
  violation_type,
  ds.date,
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
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
LIMIT 5;