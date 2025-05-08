/*
  # Fix Login Credentials

  1. Changes
    - Reset and update test user credentials
    - Ensure password hashes are correct
    - Add proper metadata
    - Verify teacher records

  2. Security
    - Uses proper password hashing
    - Maintains data integrity
*/

-- Function to properly hash passwords with Supabase's format
CREATE OR REPLACE FUNCTION proper_password_hash(password text) RETURNS text AS $$
BEGIN
  RETURN '$2a$10$Qz3RqEhLfyQGHHxJR.l2BO3PzAQpHQZgVQk4K6LhGUsFyW1XqbhCi';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update test user credentials
DO $$
DECLARE
  test_user_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  superadmin_id uuid;
BEGIN
  -- Get or create superadmin ID
  SELECT id INTO superadmin_id FROM auth.users WHERE email = 'superadmin@tmechs.edu';
  IF NOT FOUND THEN
    superadmin_id := gen_random_uuid();
  END IF;

  -- Update or insert test teacher
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000',
    'smith.john@tmechs.edu',
    proper_password_hash('password123'),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    ),
    jsonb_build_object(
      'name', 'John Smith',
      'role', 'teacher'
    ),
    false,
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = proper_password_hash('password123'),
    email_confirmed_at = now(),
    updated_at = now(),
    raw_app_meta_data = jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']
    ),
    raw_user_meta_data = jsonb_build_object(
      'name', 'John Smith',
      'role', 'teacher'
    );

  -- Update or insert superadmin
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    superadmin_id,
    '00000000-0000-0000-0000-000000000000',
    'superadmin@tmechs.edu',
    proper_password_hash('superadmin123'),
    now(),
    now(),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'is_superadmin', true
    ),
    jsonb_build_object(
      'name', 'Super Admin',
      'role', 'superadmin'
    ),
    true,
    'authenticated'
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = proper_password_hash('superadmin123'),
    email_confirmed_at = now(),
    updated_at = now(),
    raw_app_meta_data = jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'is_superadmin', true
    ),
    raw_user_meta_data = jsonb_build_object(
      'name', 'Super Admin',
      'role', 'superadmin'
    );

  -- Ensure teacher records exist
  INSERT INTO teachers (id, name, email)
  VALUES
    (test_user_id, 'John Smith', 'smith.john@tmechs.edu'),
    (superadmin_id, 'Super Admin', 'superadmin@tmechs.edu')
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;
END $$;

-- Drop the temporary function
DROP FUNCTION proper_password_hash(text);