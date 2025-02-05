/*
  # Initial Schema Setup for Smart Attendance System

  1. New Tables
    - profiles
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - full_name (text)
      - role (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - classrooms
      - id (uuid, primary key)
      - name (text)
      - description (text)
      - created_by (uuid, references profiles)
      - join_code (text, unique)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - classroom_members
      - id (uuid, primary key)
      - classroom_id (uuid, references classrooms)
      - profile_id (uuid, references profiles)
      - role (text)
      - created_at (timestamp)
    
    - attendance_records
      - id (uuid, primary key)
      - classroom_id (uuid, references classrooms)
      - profile_id (uuid, references profiles)
      - status (text)
      - verified_by_device (boolean)
      - device_id (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text,
  role text CHECK (role IN ('teacher', 'student')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create classrooms table
CREATE TABLE classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles NOT NULL,
  join_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create classroom_members table
CREATE TABLE classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES classrooms NOT NULL,
  profile_id uuid REFERENCES profiles NOT NULL,
  role text CHECK (role IN ('teacher', 'student')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(classroom_id, profile_id)
);

-- Create attendance_records table
CREATE TABLE attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES classrooms NOT NULL,
  profile_id uuid REFERENCES profiles NOT NULL,
  status text CHECK (status IN ('present', 'absent', 'late')) NOT NULL,
  verified_by_device boolean DEFAULT false,
  device_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Classrooms policies
CREATE POLICY "Users can view classrooms they are members of"
  ON classrooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_members.classroom_id = classrooms.id
      AND classroom_members.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Teachers can create classrooms"
  ON classrooms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Classroom members policies
CREATE POLICY "Users can view members of their classrooms"
  ON classroom_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classroom_members cm
      WHERE cm.classroom_id = classroom_members.classroom_id
      AND cm.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Attendance records policies
CREATE POLICY "Users can view attendance records of their classrooms"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_members.classroom_id = attendance_records.classroom_id
      AND classroom_members.profile_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can mark their own attendance"
  ON attendance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );