/*
  # Fix Test User Authentication
  
  1. Changes
    - Ensure test user exists with correct password
    - Update user metadata and settings
    - Confirm email automatically
    - Add corresponding teacher record
    
  2. Notes
    - Email: smith.john@tmechs.edu
    - Password: password123
    - User will have immediate access
*/

-- First, ensure the user exists or create them
DO $$
DECLARE
  test_user_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
BEGIN
  -- Delete existing user if present (to ensure clean state)
  DELETE FROM auth.users WHERE id = test_user_id;
  
  -- Create the user with confirmed email
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
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "John Smith", "role": "teacher"}',
    false,
    'authenticated'
  );

  -- Ensure corresponding teacher record exists
  INSERT INTO teachers (id, name, email)
  VALUES (
    test_user_id,
    'John Smith',
    'smith.john@tmechs.edu'
  )
  ON CONFLICT (id) DO UPDATE 
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email;
END $$;