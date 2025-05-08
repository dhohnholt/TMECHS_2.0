/*
  # Re-enable authentication
  
  This migration:
  1. Re-enables RLS on all tables
  2. Restores original security policies
  
  Run this when testing is complete to restore security.
*/

-- Re-enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE detention_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

-- Remove testing comments
COMMENT ON TABLE students IS NULL;
COMMENT ON TABLE teachers IS NULL;
COMMENT ON TABLE detention_slots IS NULL;
COMMENT ON TABLE violations IS NULL;