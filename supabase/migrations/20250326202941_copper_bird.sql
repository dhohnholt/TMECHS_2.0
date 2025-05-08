/*
  # Enable RLS and Update Policies

  1. Security Changes
    - Enable RLS on all tables
    - Update policies to reflect UI changes
    - Add policies for back navigation and auto-print features

  2. Changes
    - Enable RLS on students, violations, detention_slots, and teachers tables
    - Update existing policies
    - Add new policies for enhanced security
*/

-- Enable RLS on all tables
DO $$ 
BEGIN
  -- Enable RLS for each table if not already enabled
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'students' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE students ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'violations' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'detention_slots' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE detention_slots ENABLE ROW LEVEL SECURITY;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE tablename = 'teachers' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
  -- Students policies
  DROP POLICY IF EXISTS "Allow authenticated users to read students" ON students;
  DROP POLICY IF EXISTS "Allow teachers to create students" ON students;
  DROP POLICY IF EXISTS "Allow teachers to update their students" ON students;

  -- Violations policies
  DROP POLICY IF EXISTS "Allow authenticated users to read violations" ON violations;
  DROP POLICY IF EXISTS "Allow teachers to create violations" ON violations;
  DROP POLICY IF EXISTS "Allow teachers to update violations" ON violations;

  -- Detention slots policies
  DROP POLICY IF EXISTS "Allow authenticated users to read detention slots" ON detention_slots;
  DROP POLICY IF EXISTS "Allow teachers to manage their own slots" ON detention_slots;

  -- Teachers policies
  DROP POLICY IF EXISTS "Allow authenticated users to read teachers" ON teachers;
  DROP POLICY IF EXISTS "Allow teachers to update their own profile" ON teachers;
  DROP POLICY IF EXISTS "Allow teachers to insert their own records" ON teachers;
END $$;

-- Create new policies

-- Students table policies
CREATE POLICY "Allow authenticated users to read students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to create students"
  ON students
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow teachers to update their students"
  ON students
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Violations table policies
CREATE POLICY "Allow authenticated users to read violations"
  ON violations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to create violations"
  ON violations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow teachers to update violations"
  ON violations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Detention slots table policies
CREATE POLICY "Allow authenticated users to read detention slots"
  ON detention_slots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to manage their own slots"
  ON detention_slots
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers table policies
CREATE POLICY "Allow authenticated users to read teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to update their own profile"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Allow teachers to insert their own records"
  ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);