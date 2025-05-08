-- First, ensure the page_titles table exists and has the correct structure
CREATE TABLE IF NOT EXISTS page_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text UNIQUE NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default page titles for all nav links if they don't exist
INSERT INTO page_titles (path, label, description, is_visible)
VALUES 
  ('/', 'Home', 'Welcome to TMECHS Behavior Monitor', true),
  ('/violations', 'Record Violation', 'Record and manage student violations', true),
  ('/attendance', 'Attendance', 'Track detention attendance', true),
  ('/detention', 'Schedule', 'Manage detention schedules and assignments', true),
  ('/students', 'Students', 'Manage student records and information', true),
  ('/teacher-signup', 'Monitor Signup', 'Sign up for detention monitoring duty', true),
  ('/dashboard', 'Dashboard', 'View key metrics and summaries', true),
  ('/analytics', 'Analytics', 'View behavior trends and statistics', true),
  ('/profile', 'Profile', 'Manage your account settings', true),
  ('/register', 'Register', 'Create a new teacher account', true),
  ('/login', 'Login', 'Access your account', true),
  ('/teacher-approval', 'Approvals', 'Manage teacher account approvals', true),
  ('/page-titles', 'Page Titles', 'Manage page titles and descriptions', true)
ON CONFLICT (path) DO UPDATE
SET 
  label = EXCLUDED.label,
  description = EXCLUDED.description;

-- Ensure RLS is enabled
ALTER TABLE page_titles ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Allow authenticated users to read page titles" ON page_titles;
DROP POLICY IF EXISTS "Allow admins to manage page titles" ON page_titles;

CREATE POLICY "Allow authenticated users to read page titles"
  ON page_titles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage page titles"
  ON page_titles
  FOR ALL
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