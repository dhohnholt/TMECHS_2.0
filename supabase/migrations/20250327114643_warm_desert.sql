/*
  # Add Location Field to Detention Slots

  1. Changes
    - Add location column to detention_slots table
    - Set default value to 'Cafeteria'
    - Update existing records
    - Add check constraint for valid locations

  2. Notes
    - Default location is Cafeteria
    - Ensures all slots have a location
*/

-- Add location column with default value
ALTER TABLE detention_slots
ADD COLUMN location text NOT NULL DEFAULT 'Cafeteria';

-- Add check constraint for valid locations
ALTER TABLE detention_slots
ADD CONSTRAINT valid_location
CHECK (location IN ('Cafeteria', 'Library', 'Room 204', 'Gym'));

-- Update any existing records
UPDATE detention_slots
SET location = 'Cafeteria'
WHERE location IS NULL;