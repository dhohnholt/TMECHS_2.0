/*
  # Modify Warning System for Per-Violation Type Limits

  1. Changes
    - Add violation_count function to count warnings by type
    - Update warning check logic
    - Add indexes for performance

  2. Notes
    - Allows 2 warnings per violation type
    - Maintains warning history
    - Improves query performance
*/

-- Create function to count warnings by type
CREATE OR REPLACE FUNCTION get_violation_warnings(
  p_student_id uuid,
  p_violation_type text
) RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM warnings
    WHERE student_id = p_student_id
    AND violation_type = p_violation_type
  );
END;
$$ LANGUAGE plpgsql;

-- Add index for faster warning lookups
CREATE INDEX IF NOT EXISTS idx_warnings_student_violation
ON warnings (student_id, violation_type);

-- Add index for faster violation lookups
CREATE INDEX IF NOT EXISTS idx_violations_student_violation
ON violations (student_id, violation_type);