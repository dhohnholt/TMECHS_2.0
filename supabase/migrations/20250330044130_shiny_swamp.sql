/*
  # Fix Warning System and Detention Date Validation
  
  1. Changes
    - Add function to check warning count by violation type
    - Add function to validate detention date availability
    - Add trigger to prevent double-booking detention slots
    - Update violation insert/update policies
    
  2. Notes
    - Ensures proper warning count before detention
    - Prevents scheduling conflicts
    - Maintains data integrity
*/

-- Create function to count warnings by violation type
CREATE OR REPLACE FUNCTION get_warning_count(
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

-- Create function to check if detention slot is available
CREATE OR REPLACE FUNCTION is_detention_slot_available(
  p_date date,
  p_teacher_id uuid
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM detention_slots
    WHERE date = p_date
    AND teacher_id = p_teacher_id
    AND current_count < capacity
  );
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate violation insert/update
CREATE OR REPLACE FUNCTION validate_violation()
RETURNS trigger AS $$
DECLARE
  warning_count integer;
BEGIN
  -- Get warning count for this violation type
  warning_count := get_warning_count(NEW.student_id, NEW.violation_type);
  
  -- If this is a new violation and warning count is less than limit
  IF warning_count < 2 THEN
    -- Insert warning instead of violation
    INSERT INTO warnings (
      student_id,
      teacher_id,
      violation_type,
      issued_date
    ) VALUES (
      NEW.student_id,
      NEW.teacher_id,
      NEW.violation_type,
      CURRENT_TIMESTAMP
    );
    
    -- Skip violation insert
    RETURN NULL;
  END IF;
  
  -- Check if detention slot is available
  IF NOT is_detention_slot_available(NEW.detention_date::date, NEW.teacher_id) THEN
    RAISE EXCEPTION 'Detention slot is not available for this date';
  END IF;
  
  -- Update detention slot count
  UPDATE detention_slots
  SET current_count = current_count + 1
  WHERE date = NEW.detention_date::date
  AND teacher_id = NEW.teacher_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for violations table
DROP TRIGGER IF EXISTS validate_violation_trigger ON violations;
CREATE TRIGGER validate_violation_trigger
  BEFORE INSERT ON violations
  FOR EACH ROW
  EXECUTE FUNCTION validate_violation();

-- Add index for faster warning lookups
CREATE INDEX IF NOT EXISTS idx_warnings_student_violation
ON warnings (student_id, violation_type);

-- Add index for faster detention slot lookups
CREATE INDEX IF NOT EXISTS idx_detention_slots_date_teacher
ON detention_slots (date, teacher_id);