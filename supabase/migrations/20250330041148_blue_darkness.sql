/*
  # Add User Roles to Teachers Table
  
  1. Changes
    - Add role column to teachers table
    - Update existing teachers with appropriate roles
    - Add role-based policies
    
  2. Notes
    - Uses existing teachers table instead of auth.users
    - Maintains backward compatibility
    - Preserves existing data
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

-- Add check constraint for valid roles
ALTER TABLE teachers
ADD CONSTRAINT valid_role
CHECK (role IN ('teacher', 'admin'));

-- Update existing teachers
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