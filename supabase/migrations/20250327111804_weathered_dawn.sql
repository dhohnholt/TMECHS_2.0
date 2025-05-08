/*
  # Add Parent Email to Students Table

  1. Changes
    - Add parent_email column to students table
    - Update existing student records with placeholder parent emails
    - Maintain data integrity with NOT NULL constraint

  2. Notes
    - Uses the same email domain as student emails
    - Follows consistent naming pattern for parent emails
*/

-- Add parent_email column
ALTER TABLE students 
ADD COLUMN parent_email text NOT NULL DEFAULT '';

-- Update existing students with parent emails
UPDATE students
SET parent_email = REPLACE(email, 'student.', 'parent.');

-- Remove the default after populating data
ALTER TABLE students 
ALTER COLUMN parent_email DROP DEFAULT;