/*
  # Add Email Templates Management
  
  1. New Tables
    - `email_templates`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `subject` (text)
      - `html_content` (text)
      - `variables` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_active` (boolean)

  2. Security
    - Enable RLS
    - Only admins can manage templates
    - All authenticated users can read templates
*/

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  subject text NOT NULL,
  html_content text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read email templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage email templates"
  ON email_templates
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
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default templates
INSERT INTO email_templates (name, subject, html_content, variables) VALUES
(
  'violation_notification',
  'Detention Notice - TMECHS',
  '
    <h2>Detention Notice</h2>
    <p>Dear {{student_name}} and Parent/Guardian,</p>
    <p>This email is to inform you that {{student_name}} has been assigned detention for the following violation:</p>
    <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
      <p><strong>Violation:</strong> {{violation_type}}</p>
      <p><strong>Date Assigned:</strong> {{assigned_date}}</p>
      <p><strong>Detention Date:</strong> {{detention_date}}</p>
      <p><strong>Time:</strong> {{detention_time}}</p>
      <p><strong>Location:</strong> {{location}}</p>
      <p><strong>Assigned By:</strong> {{teacher_name}}</p>
    </div>
    <p><strong>Important Information:</strong></p>
    <ul>
      <li>Please arrive promptly at {{detention_time}}</li>
      <li>Bring study materials or reading material</li>
      <li>Electronic devices must be turned off and put away</li>
      <li>Failure to attend may result in additional disciplinary action</li>
      <li>Parents must make arrangements for transportation after detention</li>
    </ul>
    <p>If you have any questions or concerns, please contact {{teacher_name}} at {{teacher_email}} or visit the main office.</p>
    <p>Thank you for your cooperation.</p>
  ',
  '[
    {"name": "student_name", "description": "Student''s full name"},
    {"name": "violation_type", "description": "Type of violation committed"},
    {"name": "assigned_date", "description": "Date violation was recorded"},
    {"name": "detention_date", "description": "Scheduled detention date"},
    {"name": "detention_time", "description": "Detention start time"},
    {"name": "location", "description": "Detention location"},
    {"name": "teacher_name", "description": "Assigning teacher''s name"},
    {"name": "teacher_email", "description": "Teacher''s email address"}
  ]'::jsonb
),
(
  'parent_verification',
  'Welcome to TMECHS Parent Portal',
  '
    <h2>Welcome to TMECHS Parent Portal</h2>
    <p>Dear Parent/Guardian,</p>
    <p>Your access code for the TMECHS Parent Portal is:</p>
    <div style="margin: 20px 0; text-align: center;">
      <p style="font-size: 24px; font-weight: bold; padding: 10px; background: #f1f8e9; border-radius: 4px;">
        {{access_code}}
      </p>
    </div>
    <p>Use this code to access your student''s behavior records and detention information.</p>
    <p>Visit <a href="{{portal_url}}">the parent portal</a> to get started.</p>
    <p><strong>Student Information:</strong></p>
    <ul>
      <li>Name: {{student_name}}</li>
      <li>Grade: {{student_grade}}</li>
      <li>ID: {{student_id}}</li>
    </ul>
  ',
  '[
    {"name": "access_code", "description": "Parent portal access code"},
    {"name": "portal_url", "description": "URL to parent portal"},
    {"name": "student_name", "description": "Student''s full name"},
    {"name": "student_grade", "description": "Student''s grade level"},
    {"name": "student_id", "description": "Student''s ID number"}
  ]'::jsonb
);