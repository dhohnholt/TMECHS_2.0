/*
  # Add Page Title Visibility Control
  
  1. Changes
    - Add `show_on_home` column to page_titles table
    - Set default value to true
    - Update existing records
    
  2. Notes
    - Boolean column for controlling visibility
    - All existing titles will be visible by default
*/

-- Add show_on_home column
ALTER TABLE page_titles
ADD COLUMN show_on_home boolean NOT NULL DEFAULT true;

-- Update any existing records
UPDATE page_titles
SET show_on_home = true
WHERE show_on_home IS NULL;