/*
  # Add User Preferences to Teachers Table

  1. Changes
    - Add preferences column to teachers table to store user settings
    - Add check constraint to ensure valid theme values

  2. Data Type
    - preferences: JSONB column to store flexible user preferences
      - emailNotifications: boolean
      - detentionReminders: boolean
      - violationAlerts: boolean
      - weeklyReports: boolean
      - theme: text (light, dark, or system)
*/

ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "emailNotifications": true,
  "detentionReminders": true,
  "violationAlerts": true,
  "weeklyReports": true,
  "theme": "system"
}'::jsonb;

-- Add check constraint for theme values
ALTER TABLE teachers
ADD CONSTRAINT valid_theme 
CHECK (
  (preferences->>'theme')::text IN ('light', 'dark', 'system')
);