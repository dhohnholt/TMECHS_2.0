/*
  # Insert Test Teacher Account

  1. Changes
    - Add test teacher account if it doesn't exist
    - Handle conflicts for both auth.users and teachers tables
    - Use DO block for conditional insertion

  2. Notes
    - Password is 'password123' for testing
    - Uses proper error handling
*/

DO $$
BEGIN
  -- Only insert the user if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
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
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      '00000000-0000-0000-0000-000000000000',
      'smith.john@tmechs.edu',
      '$2a$10$5RwAIzFvP7HVqcFj8JI0P.ug5v6IyZvlK9rpZ.NuTGGPF7.CXk6Hy', -- This is 'password123'
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated'
    );
  END IF;
END $$;

-- Insert corresponding teacher record if it doesn't exist
INSERT INTO teachers (id, name, email)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'John Smith',
  'smith.john@tmechs.edu'
) ON CONFLICT (id) DO NOTHING;