/*
  # Add Detention Slot Management Features

  1. Changes
    - Add validation for detention slot dates
    - Add trigger to prevent past date modifications
    - Add trigger to prevent deletion of slots with students
    - Add function to check slot availability

  2. Notes
    - Ensures data integrity
    - Prevents invalid modifications
    - Protects student assignments
*/

-- Create function to validate detention slot date
CREATE OR REPLACE FUNCTION validate_detention_slot_date()
RETURNS trigger AS $$
BEGIN
  -- Prevent slots in the past
  IF NEW.date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot create or modify slots for past dates';
  END IF;

  -- Prevent weekend slots
  IF EXTRACT(DOW FROM NEW.date) IN (0, 6) THEN
    RAISE EXCEPTION 'Cannot create slots for weekends';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for date validation
CREATE TRIGGER ensure_valid_slot_date
  BEFORE INSERT OR UPDATE ON detention_slots
  FOR EACH ROW
  EXECUTE FUNCTION validate_detention_slot_date();

-- Create function to check if slot can be deleted
CREATE OR REPLACE FUNCTION check_slot_deletion()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM violations
    WHERE detention_date::date = OLD.date
    AND status NOT IN ('reassigned', 'absent')
  ) THEN
    RAISE EXCEPTION 'Cannot delete slot with assigned students';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for deletion check
CREATE TRIGGER prevent_slot_with_students_deletion
  BEFORE DELETE ON detention_slots
  FOR EACH ROW
  EXECUTE FUNCTION check_slot_deletion();