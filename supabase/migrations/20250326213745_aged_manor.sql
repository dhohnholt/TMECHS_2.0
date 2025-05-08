/*
  # Add Teacher Approval System

  1. Changes
    - Add `is_approved` column to teachers table
    - Add `is_admin` column to teachers table
    - Update existing policies to respect approval status
    - Add new policies for admin actions
    - Set superuser as admin

  2. Security
    - Only approved teachers can create violations and detention slots
    - Only admins can approve teachers
*/

-- Add new columns to teachers table
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set superuser as approved and admin
UPDATE teachers
SET is_approved = true, is_admin = true
WHERE email = 'dhohnholt@gmail.com';

-- Update policies to respect approval status
DROP POLICY IF EXISTS "Allow teachers to create violations" ON violations;
CREATE POLICY "Allow approved teachers to create violations"
  ON violations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  );

DROP POLICY IF EXISTS "Allow teachers to manage their own slots" ON detention_slots;
CREATE POLICY "Allow approved teachers to manage their own slots"
  ON detention_slots
  FOR ALL
  TO authenticated
  USING (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  )
  WITH CHECK (
    teacher_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_approved = true
    )
  );

-- Create admin-specific policies
CREATE POLICY "Allow admins to update any teacher"
  ON teachers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );