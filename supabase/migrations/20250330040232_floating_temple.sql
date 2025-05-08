/*
  # Add Role-Based Access Control

  1. Changes
    - Create parent_student_relations table
    - Add RLS policies for role-based access
    - Add helper functions for role checks
    - Update existing policies

  2. Security
    - Strict access control based on roles
    - Parent can only access their student's data
    - Students can only access their own data
    - Teachers have broader access
    - Admins have full access
*/

-- Create parent_student_relations table
CREATE TABLE IF NOT EXISTS parent_student_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS on parent_student_relations
ALTER TABLE parent_student_relations ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for students table
DROP POLICY IF EXISTS "read_students" ON students;
CREATE POLICY "students_read_own_data"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    -- Students can read their own data
    (auth.uid() = id AND (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student')
    OR
    -- Parents can read their linked students' data
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN auth.users u ON u.id = psr.parent_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND psr.student_id = students.id
    )
    OR
    -- Teachers and admins can read all student data
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Update RLS policies for violations table
DROP POLICY IF EXISTS "read_violations" ON violations;
CREATE POLICY "violations_read_policy"
  ON violations
  FOR SELECT
  TO authenticated
  USING (
    -- Students can read their own violations
    (student_id = auth.uid() AND (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student')
    OR
    -- Parents can read their students' violations
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN auth.users u ON u.id = psr.parent_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND psr.student_id = violations.student_id
    )
    OR
    -- Teachers and admins can read all violations
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "violations_insert_policy"
  ON violations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "violations_update_policy"
  ON violations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Update RLS policies for warnings table
DROP POLICY IF EXISTS "read_warnings" ON warnings;
CREATE POLICY "warnings_read_policy"
  ON warnings
  FOR SELECT
  TO authenticated
  USING (
    -- Students can read their own warnings
    (student_id = auth.uid() AND (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student')
    OR
    -- Parents can read their students' warnings
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN auth.users u ON u.id = psr.parent_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND psr.student_id = warnings.student_id
    )
    OR
    -- Teachers and admins can read all warnings
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "warnings_insert_policy"
  ON warnings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Update RLS policies for detention_slots table
DROP POLICY IF EXISTS "read_detention_slots" ON detention_slots;
CREATE POLICY "detention_slots_read_policy"
  ON detention_slots
  FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can read detention slots

CREATE POLICY "detention_slots_manage_policy"
  ON detention_slots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
  );

-- Update RLS policies for teachers table
DROP POLICY IF EXISTS "read_teachers" ON teachers;
CREATE POLICY "teachers_read_policy"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (true); -- All authenticated users can read teacher info

CREATE POLICY "teachers_manage_policy"
  ON teachers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create function to check if user can access student data
CREATE OR REPLACE FUNCTION can_access_student(student_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN 
    -- User is the student
    (auth.uid() = student_id AND (SELECT role FROM auth.users WHERE id = auth.uid()) = 'student')
    OR
    -- User is parent of the student
    EXISTS (
      SELECT 1 FROM parent_student_relations psr
      JOIN auth.users u ON u.id = psr.parent_id
      WHERE u.id = auth.uid()
      AND u.role = 'parent'
      AND psr.student_id = $1
    )
    OR
    -- User is teacher or admin
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;