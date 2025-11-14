-- Document Analysis Service Database Schema
-- This migration adds tables for the standalone document analysis service

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NOTE: profiles table already exists in the main Export Tracker system
-- NOTE: document_comparison_rules table already exists in the main Export Tracker system
-- We will use the existing tables and only add the analysis_sessions table

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS analysis_sessions CASCADE;

-- Analysis sessions table
CREATE TABLE analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES document_comparison_rules(id) ON DELETE CASCADE,

  -- Session data
  quotation_id TEXT,
  quotation_summary TEXT, -- Summary for display: "Company - Destination"
  document_ids JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) DEFAULT 'pending',
  results JSONB,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create indexes for analysis_sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_rule_id ON analysis_sessions(rule_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON analysis_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON analysis_sessions(created_at);

-- Enable Row Level Security for analysis_sessions
-- NOTE: profiles and document_comparison_rules already have RLS enabled
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analysis_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analysis_sessions'
    AND policyname = 'Users can view their own sessions'
  ) THEN
    CREATE POLICY "Users can view their own sessions"
      ON analysis_sessions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analysis_sessions'
    AND policyname = 'Users can create their own sessions'
  ) THEN
    CREATE POLICY "Users can create their own sessions"
      ON analysis_sessions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'analysis_sessions'
    AND policyname = 'Users can update their own sessions'
  ) THEN
    CREATE POLICY "Users can update their own sessions"
      ON analysis_sessions
      FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- NOTE: profiles and document_comparison_rules triggers already exist in the main system
-- Only grant permissions for the new analysis_sessions table

-- Grant permissions for analysis_sessions
GRANT ALL ON analysis_sessions TO authenticated;

-- Verification queries (run these manually to check if migration worked)
-- SELECT * FROM information_schema.tables WHERE table_name = 'analysis_sessions';
-- SELECT * FROM information_schema.table_constraints WHERE table_name = 'analysis_sessions';
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'analysis_sessions';
