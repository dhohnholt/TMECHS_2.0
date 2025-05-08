/*
  # Create Superadmin User

  1. Changes
    - Add superadmin user with confirmed email
    - Set appropriate permissions and metadata
    - Create corresponding teacher record
    - Use secure password hashing

  2. Security
    - Password is set to 'superadmin123'
    - Email is pre-confirmed
    - Full superadmin privileges granted
*/

DO $$
DECLARE
  superadmin_id uuid := gen_random_uuid();
BEGIN
  -- Create the superadmin user with confirmed email
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
    crypt('superadmin123', gen_salt('bf')),
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
  );

  -- Create corresponding teacher record
  INSERT INTO teachers (id, name, email)
  VALUES (
    superadmin_id,
    'Super Admin',
    'superadmin@tmechs.edu'
  );
END $$;