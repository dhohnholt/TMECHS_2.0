/*
  # Add Role System to Teachers Table
  
  1. Changes
    - Add role column if not exists
    - Drop and recreate constraint if exists
    - Update existing teachers
    - Add helper functions
    
  2. Notes
    - Handles existing constraint
    - Preserves data integrity
    - Adds role validation
*/

-- Add role column to teachers table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teachers' AND column_name = 'role'
  ) THEN
    ALTER TABLE teachers ADD COLUMN role text NOT NULL DEFAULT 'teacher';
  END IF;
END $$;

-- Drop existing constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_role' 
    AND table_name = 'teachers'
  ) THEN
    ALTER TABLE teachers DROP CONSTRAINT valid_role;
  END IF;
END $$;

-- Add check constraint for valid roles
ALTER TABLE teachers
ADD CONSTRAINT valid_role
CHECK (role IN ('teacher', 'admin'));

-- Update existing teachers based on is_admin flag
UPDATE teachers 
SET role = CASE 
  WHEN is_admin = true THEN 'admin'
  ELSE 'teacher'
END;

-- Create function to check user role
CREATE OR REPLACE FUNCTION check_user_role(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers
    WHERE id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can access student data
CREATE OR REPLACE FUNCTION can_access_student(student_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN 
    -- User is teacher or admin
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND role IN ('teacher', 'admin')
    )
    OR
    -- User is parent of the student
    EXISTS (
      SELECT 1 FROM parent_student_relations
      WHERE parent_id = auth.uid()
      AND student_id = $1
    )
    OR
    -- User is the student
    auth.uid() = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;