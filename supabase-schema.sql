-- Fee Manager Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- App Metadata Table (for global states like expenses, logs, etc.)
CREATE TABLE IF NOT EXISTS app_metadata (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  expenses JSONB DEFAULT '[]',
  action_logs JSONB DEFAULT '[]',
  branch_collections JSONB DEFAULT '[]',
  due_reminders JSONB DEFAULT '[]',
  reminder_history JSONB DEFAULT '[]',
  fee_structures JSONB DEFAULT '{}',
  receipt_books JSONB DEFAULT '[]',
  cancelled_receipts JSONB DEFAULT '[]',
  academics_selections JSONB DEFAULT '{}',
  global_waiver_config NUMERIC DEFAULT 15,
  locked_sessions JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students Table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, -- Using TEXT to match frontend-generated IDs
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fee Records Table
CREATE TABLE IF NOT EXISTS fee_records (
  id TEXT PRIMARY KEY, -- Using TEXT to match frontend-generated IDs
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_user_id ON fee_records(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_student_id ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_payment_date ON fee_records(payment_date);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records ENABLE ROW LEVEL SECURITY;

-- Students RLS Policies
-- Users can only see their own students
CREATE POLICY "Users can view their own students"
  ON students FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own students
CREATE POLICY "Users can insert their own students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own students
CREATE POLICY "Users can update their own students"
  ON students FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own students
CREATE POLICY "Users can delete their own students"
  ON students FOR DELETE
  USING (auth.uid() = user_id);

-- Fee Records RLS Policies
-- Users can only see their own fee records
CREATE POLICY "Users can view their own fee records"
  ON fee_records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own fee records
CREATE POLICY "Users can insert their own fee records"
  ON fee_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own fee records
CREATE POLICY "Users can update their own fee records"
  ON fee_records FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own fee records
CREATE POLICY "Users can delete their own fee records"
  ON fee_records FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_records_updated_at
  BEFORE UPDATE ON fee_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE fee_records;
