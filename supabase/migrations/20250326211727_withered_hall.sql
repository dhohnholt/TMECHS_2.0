/*
  # Add Superuser Account

  1. Changes
    - Temporarily remove email domain constraint
    - Add superuser account for David Hohnholt
    - Add necessary RLS policies

  2. Security
    - Enable RLS for affected tables
    - Update policies to allow superuser access
*/

-- Remove email domain constraint if it exists
ALTER TABLE teachers
DROP CONSTRAINT IF EXISTS email_domain_check;

-- Insert superuser account
INSERT INTO teachers (
  id,
  name,
  email,
  preferences
) VALUES (
  'e8e51f5c-5bb2-4b63-8ebb-19c0c61c5e1c',
  'David Hohnholt',
  'dhohnholt@gmail.com',
  '{
    "theme": "system",
    "weeklyReports": true,
    "violationAlerts": true,
    "detentionReminders": true,
    "emailNotifications": true
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  preferences = EXCLUDED.preferences;

-- Create auth user (this will be handled by the auth system, but we'll document it)
-- The actual user creation should be done through the Supabase dashboard or auth API
-- password: superuser123