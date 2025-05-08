/*
  # Temporarily Disable Authentication for Testing

  1. Changes
    - Disable RLS on all tables
    - Add comments to indicate testing status
    - Keep track of which tables had RLS disabled

  2. Notes
    - This is a TEMPORARY change for testing only
    - Should be reverted before production deployment
*/

-- Temporarily disable RLS on all tables
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE detention_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE violations DISABLE ROW LEVEL SECURITY;

-- Create revert migration file for re-enabling RLS later
COMMENT ON TABLE students IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE teachers IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE detention_slots IS 'RLS temporarily disabled for testing';
COMMENT ON TABLE violations IS 'RLS temporarily disabled for testing';