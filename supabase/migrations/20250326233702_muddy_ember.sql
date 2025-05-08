/*
  # Disable RLS for Testing
  
  1. Changes
    - Disable RLS on all tables
    - Add comments to track disabled tables
    - Remove all existing policies
    
  2. Notes
    - This is TEMPORARY for testing only
    - Must be re-enabled before production
*/

-- Drop all existing policies
DO $$ 
BEGIN
  -- Students policies
  DROP POLICY IF EXISTS "read_students" ON students;
  DROP POLICY IF EXISTS "manage_students" ON students;

  -- Violations policies
  DROP POLICY IF EXISTS "read_violations" ON violations;
  DROP POLICY IF EXISTS "manage_violations" ON violations;

  -- Detention slots policies
  DROP POLICY IF EXISTS "read_detention_slots" ON detention_slots;
  DROP POLICY IF EXISTS "manage_detention_slots" ON detention_slots;

  -- Teachers policies
  DROP POLICY IF EXISTS "read_teachers" ON teachers;
  DROP POLICY IF EXISTS "manage_own_profile" ON teachers;
  DROP POLICY IF EXISTS "admin_manage_teachers" ON teachers;

  -- Warnings policies
  DROP POLICY IF EXISTS "read_warnings" ON warnings;
  DROP POLICY IF EXISTS "manage_warnings" ON warnings;
END $$;

-- Disable RLS on all tables
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE detention_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE violations DISABLE ROW LEVEL SECURITY;
ALTER TABLE warnings DISABLE ROW LEVEL SECURITY;

-- Add comments to track which tables have RLS disabled
COMMENT ON TABLE students IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE teachers IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE detention_slots IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE violations IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE warnings IS 'RLS temporarily disabled for testing';