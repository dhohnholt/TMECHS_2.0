/*
  # Add Parent Access System

  1. Changes
    - Add parent_access_code to students table
    - Add parent_verified column to track verification status
    - Add parent_verified_at timestamp
    - Add function to generate secure access codes
    - Add trigger to auto-generate codes for new students

  2. Security
    - Access codes are randomly generated
    - Codes are required for parent access
    - Track verification status and time
*/

-- Add parent access columns to students table
ALTER TABLE students
ADD COLUMN parent_access_code text UNIQUE,
ADD COLUMN parent_verified boolean DEFAULT false,
ADD COLUMN parent_verified_at timestamptz;

-- Create function to generate secure access codes
CREATE OR REPLACE FUNCTION generate_parent_access_code()
RETURNS text AS $$
DECLARE
  code text;
  valid boolean;
BEGIN
  valid := false;
  WHILE NOT valid LOOP
    -- Generate 8-character code: 2 letters + 6 numbers
    code := 
      chr(65 + floor(random() * 26)::integer) || 
      chr(65 + floor(random() * 26)::integer) ||
      floor(random() * 1000000)::text;
    
    -- Pad with leading zeros if needed
    code := substring(code, 1, 2) || lpad(substring(code, 3), 6, '0');
    
    -- Check if code is unique
    valid := NOT EXISTS (
      SELECT 1 FROM students WHERE parent_access_code = code
    );
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to generate access codes for new students
CREATE OR REPLACE FUNCTION generate_access_code_trigger()
RETURNS trigger AS $$
BEGIN
  IF NEW.parent_access_code IS NULL THEN
    NEW.parent_access_code := generate_parent_access_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_parent_access_code
  BEFORE INSERT ON students
  FOR EACH ROW
  EXECUTE FUNCTION generate_access_code_trigger();

-- Generate codes for existing students
UPDATE students
SET parent_access_code = generate_parent_access_code()
WHERE parent_access_code IS NULL;