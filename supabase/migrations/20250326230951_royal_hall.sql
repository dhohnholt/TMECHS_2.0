/*
  # Simplify Authorization Policies

  1. Changes
    - Remove redundant policies
    - Consolidate overlapping policies
    - Keep only essential security rules
    - Maintain RLS enabled on all tables

  2. Security
    - Maintain data access control
    - Keep admin-specific policies
    - Preserve core security model
*/

-- Drop all existing policies
DO $$ 
BEGIN
  -- Students policies
  DROP POLICY IF EXISTS "Allow authenticated users to read students" ON students;
  DROP POLICY IF EXISTS "Allow teachers to create students" ON students;
  DROP POLICY IF EXISTS "Allow teachers to update their students" ON students;
  DROP POLICY IF EXISTS "Enable read access for logged-in user" ON students;

  -- Violations policies
  DROP POLICY IF EXISTS "Allow authenticated users to read violations" ON violations;
  DROP POLICY IF EXISTS "Allow teachers to create violations" ON violations;
  DROP POLICY IF EXISTS "Allow teachers to update violations" ON violations;
  DROP POLICY IF EXISTS "Allow approved teachers to create violations" ON violations;

  -- Detention slots policies
  DROP POLICY IF EXISTS "Allow authenticated users to read detention slots" ON detention_slots;
  DROP POLICY IF EXISTS "Allow teachers to manage their own slots" ON detention_slots;
  DROP POLICY IF EXISTS "Allow approved teachers to manage their own slots" ON detention_slots;

  -- Teachers policies
  DROP POLICY IF EXISTS "Allow authenticated users to read teachers" ON teachers;
  DROP POLICY IF EXISTS "Allow teachers to update their own profile" ON teachers;
  DROP POLICY IF EXISTS "Allow teachers to insert their own records" ON teachers;
  DROP POLICY IF EXISTS "Allow logged in teachers to read their data" ON teachers;
  DROP POLICY IF EXISTS "Allow logged-in teacher to read own profile" ON teachers;
  DROP POLICY IF EXISTS "Admins can view all teacher records" ON teachers;
  DROP POLICY IF EXISTS "Allow admins to update any teacher" ON teachers;
  DROP POLICY IF EXISTS "Enable read access for logged-in user" ON teachers;

  -- Warnings policies
  DROP POLICY IF EXISTS "Allow authenticated users to read warnings" ON warnings;
  DROP POLICY IF EXISTS "Allow teachers to create warnings" ON warnings;
  DROP POLICY IF EXISTS "Allow teachers to manage their own warnings" ON warnings;
END $$;

-- Create simplified policies

-- Students table
CREATE POLICY "read_students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_students"
  ON students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  );

-- Violations table
CREATE POLICY "read_violations"
  ON violations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_violations"
  ON violations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  );

-- Detention slots table
CREATE POLICY "read_detention_slots"
  ON detention_slots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_detention_slots"
  ON detention_slots
  FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  )
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  );

-- Teachers table
CREATE POLICY "read_teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_own_profile"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "admin_manage_teachers"
  ON teachers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Warnings table
CREATE POLICY "read_warnings"
  ON warnings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "manage_warnings"
  ON warnings
  FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  )
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  );