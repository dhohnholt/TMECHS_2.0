/*
  # Temporarily Disable RLS for Testing
  
  1. Changes
    - Disable RLS on all tables
    - Add comments to track disabled tables
    - Will need to be re-enabled before production
*/

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