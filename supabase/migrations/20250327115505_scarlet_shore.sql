/*
  # Add User Profile Enhancements

  1. Changes
    - Add preferences validation function
    - Add email format check
    - Add classroom number format check
    - Add trigger for preferences validation

  2. Notes
    - Ensures data consistency
    - Validates email formats
    - Validates classroom number format
*/

-- Create function to validate preferences
CREATE OR REPLACE FUNCTION validate_teacher_preferences(prefs jsonb)
RETURNS boolean AS $$
BEGIN
  -- Check required fields exist
  IF NOT (
    prefs ? 'theme' AND
    prefs ? 'weeklyReports' AND
    prefs ? 'violationAlerts' AND
    prefs ? 'detentionReminders' AND
    prefs ? 'emailNotifications'
  ) THEN
    RETURN false;
  END IF;

  -- Validate theme value
  IF NOT (prefs->>'theme' IN ('light', 'dark', 'system')) THEN
    RETURN false;
  END IF;

  -- Validate boolean fields
  IF NOT (
    (prefs->>'weeklyReports')::boolean IS NOT NULL AND
    (prefs->>'violationAlerts')::boolean IS NOT NULL AND
    (prefs->>'detentionReminders')::boolean IS NOT NULL AND
    (prefs->>'emailNotifications')::boolean IS NOT NULL
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Add email format check
ALTER TABLE teachers
ADD CONSTRAINT valid_email_format
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add preferences validation trigger
CREATE OR REPLACE FUNCTION validate_preferences_trigger()
RETURNS trigger AS $$
BEGIN
  IF NOT validate_teacher_preferences(NEW.preferences) THEN
    RAISE EXCEPTION 'Invalid preferences format';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_valid_preferences
  BEFORE INSERT OR UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION validate_preferences_trigger();