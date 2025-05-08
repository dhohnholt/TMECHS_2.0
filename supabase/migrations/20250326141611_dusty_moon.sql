/*
  # Fix Test User Credentials

  1. Changes
    - Update test user's password hash
    - Ensure email is confirmed
    - Update metadata
    - Verify teacher record exists

  2. Notes
    - Sets password to 'password123' for testing
    - Ensures user can log in with smith.john@tmechs.edu
*/

-- Update the test user's credentials
UPDATE auth.users 
SET
  encrypted_password = '$2a$10$RgZM/1PCSG2UeYcjobs89OJSxl.TPxD1s1.nby9s6.tqj9.U0T0Gy', -- password123
  email_confirmed_at = now(),
  updated_at = now(),
  raw_app_meta_data = jsonb_build_object(
    'provider', 'email',
    'providers', ARRAY['email']
  ),
  raw_user_meta_data = jsonb_build_object(
    'name', 'John Smith',
    'role', 'teacher'
  )
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- Ensure the teacher record exists and is up to date
INSERT INTO teachers (id, name, email)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'John Smith',
  'smith.john@tmechs.edu'
)
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  email = EXCLUDED.email;