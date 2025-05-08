/*
  # Add Classroom Number to Teachers

  1. Changes
    - Add classroom_number column to teachers table
    - Add check constraint for valid format
    - Update detention_slots location constraint
    - Add function to format classroom as location

  2. Notes
    - Format: C101, C202, A103, etc.
    - Allows classroom to be used as detention location
*/

-- Add classroom_number column
ALTER TABLE teachers
ADD COLUMN classroom_number text;

-- Add check constraint for classroom format
ALTER TABLE teachers
ADD CONSTRAINT valid_classroom_number
CHECK (classroom_number ~ '^[A-Z][0-9]{3}$');

-- Create function to format classroom as location
CREATE OR REPLACE FUNCTION format_classroom_location(classroom text)
RETURNS text AS $$
BEGIN
  RETURN 'Room ' || classroom;
END;
$$ LANGUAGE plpgsql;

-- Update detention_slots location constraint to allow classrooms
ALTER TABLE detention_slots
DROP CONSTRAINT valid_location;

ALTER TABLE detention_slots
ADD CONSTRAINT valid_location
CHECK (
  location IN ('Cafeteria', 'Library', 'Room 204', 'Gym') OR
  location ~ '^Room [A-Z][0-9]{3}$'
);