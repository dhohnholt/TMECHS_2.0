/*
  # Add Page Titles Table

  1. New Tables
    - `page_titles`
      - `id` (uuid, primary key)
      - `path` (text, unique)
      - `label` (text)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on page_titles table
    - Only admins can modify titles
    - All authenticated users can read titles
*/

-- Create page_titles table
CREATE TABLE IF NOT EXISTS page_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text UNIQUE NOT NULL,
  label text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE page_titles ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_page_titles_updated_at
  BEFORE UPDATE ON page_titles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();