/*
  # Initial Schema Setup for TMECHS Behavior Monitoring

  1. New Tables
    - `students`
      - `id` (uuid, primary key)
      - `barcode` (text, unique)
      - `name` (text)
      - `email` (text)
      - `grade` (integer)
      - `created_at` (timestamp)

    - `teachers`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text)
      - `created_at` (timestamp)

    - `detention_slots`
      - `id` (uuid, primary key)
      - `date` (date)
      - `teacher_id` (uuid, references teachers)
      - `capacity` (integer)
      - `current_count` (integer)
      - `created_at` (timestamp)

    - `violations`
      - `id` (uuid, primary key)
      - `student_id` (uuid, references students)
      - `violation_type` (text)
      - `assigned_date` (timestamp)
      - `detention_date` (timestamp)
      - `teacher_id` (uuid, references teachers)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode text UNIQUE NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  grade integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read students"
  ON students
  FOR SELECT
  TO authenticated
  USING (true);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read teachers"
  ON teachers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to insert their own records"
  ON teachers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create detention_slots table
CREATE TABLE IF NOT EXISTS detention_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  teacher_id uuid REFERENCES teachers(id) NOT NULL,
  capacity integer NOT NULL DEFAULT 20,
  current_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_count CHECK (current_count >= 0 AND current_count <= capacity)
);

ALTER TABLE detention_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read detention slots"
  ON detention_slots
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to manage their own slots"
  ON detention_slots
  FOR ALL
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Create violations table
CREATE TABLE IF NOT EXISTS violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  violation_type text NOT NULL,
  assigned_date timestamptz DEFAULT now(),
  detention_date timestamptz NOT NULL,
  teacher_id uuid REFERENCES teachers(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'attended', 'absent', 'reassigned'))
);

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read violations"
  ON violations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow teachers to create violations"
  ON violations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow teachers to update violations"
  ON violations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);