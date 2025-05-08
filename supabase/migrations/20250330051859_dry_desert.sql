/*
  # Fix Violation Validation Logic
  
  1. Changes
    - Add is_warning flag to violations table
    - Update validation trigger to respect user's choice
    - Remove automatic warning conversion
    
  2. Notes
    - Allows explicit choice between warning and violation
    - Maintains warning count tracking
    - Preserves slot availability check
*/

-- Add is_warning flag to violations if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'violations' AND column_name = 'is_warning'
  ) THEN
    ALTER TABLE violations ADD COLUMN is_warning boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create function to check if detention slot is available
CREATE OR REPLACE FUNCTION is_detention_slot_available(
  p_date date
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM detention_slots
    WHERE date = p_date
    AND current_count < capacity
  );
END;
$$ LANGUAGE plpgsql;

-- Update validation trigger to respect is_warning flag
CREATE OR REPLACE FUNCTION validate_violation()
RETURNS trigger AS $$
DECLARE
  slot_id uuid;
BEGIN
  -- If this is a warning, just insert it
  IF NEW.is_warning THEN
    RETURN NEW;
  END IF;
  
  -- For violations, check if detention slot is available
  IF NOT is_detention_slot_available(NEW.detention_date::date) THEN
    RAISE EXCEPTION 'Detention slot is not available for this date';
  END IF;
  
  -- Get available slot ID
  SELECT id INTO slot_id
  FROM detention_slots
  WHERE date = NEW.detention_date::date
  AND current_count < capacity
  ORDER BY current_count ASC
  LIMIT 1;
  
  -- Update detention slot count
  UPDATE detention_slots
  SET current_count = current_count + 1
  WHERE id = slot_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS validate_violation_trigger ON violations;
CREATE TRIGGER validate_violation_trigger
  BEFORE INSERT ON violations
  FOR EACH ROW
  EXECUTE FUNCTION validate_violation();

-- Add index for faster detention slot lookups
CREATE INDEX IF NOT EXISTS idx_detention_slots_date
ON detention_slots (date);

-- Add index for slot capacity lookups
CREATE INDEX IF NOT EXISTS idx_detention_slots_capacity
ON detention_slots (date, current_count, capacity);