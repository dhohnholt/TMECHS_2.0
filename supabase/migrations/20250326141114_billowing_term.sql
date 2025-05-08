/*
  # Fix Login Credentials

  1. Changes
    - Update the test user's password hash to a known working value
    - Ensure email is confirmed
    - Add proper metadata
    - Update corresponding teacher record

  2. Security
    - Password is 'password123' for testing
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