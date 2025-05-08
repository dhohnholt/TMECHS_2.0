/*
  # Add Superadmin User

  1. Changes
    - Add David Hohnholt as a superadmin user
    - Create corresponding teacher record
    - Set appropriate permissions

  2. Security
    - User will have superadmin privileges
    - Email confirmation is disabled for this account
*/

DO $$
DECLARE
  user_id uuid;
BEGIN
  -- Only insert the user if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'hohnholt.david@tmechs.edu'
  ) THEN
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
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'hohnholt.david@tmechs.edu',
      crypt('password123', gen_salt('bf')), -- Temporary password that should be changed on first login
      now(),
      now(),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'is_superadmin', true
      ),
      jsonb_build_object(
        'name', 'David Hohnholt',
        'role', 'superadmin'
      ),
      true,
      'authenticated'
    ) RETURNING id INTO user_id;

    -- Create corresponding teacher record
    INSERT INTO teachers (id, name, email)
    VALUES (
      user_id,
      'David Hohnholt',
      'hohnholt.david@tmechs.edu'
    );
  END IF;
END $$;