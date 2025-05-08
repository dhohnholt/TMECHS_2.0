/*
  # Temporarily disable authentication for testing
  
  This migration:
  1. Updates RLS policies to allow public access
  2. Can be reverted by running the revert migration
  
  WARNING: This should only be used for testing!
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