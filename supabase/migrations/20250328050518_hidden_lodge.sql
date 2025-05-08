/*
  # Add Page Visibility Control
  
  1. Changes
    - Add `is_visible` column to page_titles table
    - Set default value to true
    - Update existing records
    - Add index for faster lookups
    
  2. Notes
    - Boolean column for controlling visibility
    - All existing pages will be visible by default
*/

-- Add is_visible column
ALTER TABLE page_titles
ADD COLUMN is_visible boolean NOT NULL DEFAULT true;

-- Update any existing records
UPDATE page_titles
SET is_visible = true
WHERE is_visible IS NULL;

-- Add index for faster visibility lookups
CREATE INDEX idx_page_titles_visibility 
ON page_titles(path, is_visible);