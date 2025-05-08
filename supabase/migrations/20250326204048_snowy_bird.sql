/*
  # Add warnings support
  
  1. New Tables
    - `warnings`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references students)
      - `teacher_id` (uuid, references teachers) 
      - `violation_type` (text)
      - `issued_date` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on warnings table
    - Add policies for authenticated users
*/

-- Create warnings table
CREATE TABLE IF NOT EXISTS warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  violation_type text NOT NULL,
  issued_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- Enable RLS
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow authenticated users to read warnings"
  ON warnings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to create warnings"
  ON warnings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow teachers to manage their own warnings"
  ON warnings
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());