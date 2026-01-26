-- Migration: Create user_app_state table for persistent app state
-- Date: 2026-01-26
-- Description: Stores per-user application state that persists across sessions

-- Create the user_app_state table
CREATE TABLE IF NOT EXISTS public.user_app_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_states JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one entry per user
  CONSTRAINT user_app_state_user_id_unique UNIQUE (user_id)
);

-- Create index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_app_state_user_id ON public.user_app_state(user_id);

-- Create index for querying specific tool states (GIN for JSONB)
CREATE INDEX IF NOT EXISTS idx_user_app_state_tool_states ON public.user_app_state USING GIN (tool_states);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_app_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own app state
CREATE POLICY "Users can view own app state" ON public.user_app_state
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own app state
CREATE POLICY "Users can insert own app state" ON public.user_app_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own app state
CREATE POLICY "Users can update own app state" ON public.user_app_state
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own app state
CREATE POLICY "Users can delete own app state" ON public.user_app_state
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_app_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS trigger_update_user_app_state_updated_at ON public.user_app_state;
CREATE TRIGGER trigger_update_user_app_state_updated_at
  BEFORE UPDATE ON public.user_app_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_app_state_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_app_state TO authenticated;

-- Comment on table
COMMENT ON TABLE public.user_app_state IS 'Stores per-user application state (tool configurations, view preferences, etc.) that persists across sessions';
COMMENT ON COLUMN public.user_app_state.tool_states IS 'JSONB object containing state for each tool/app. Keys are tool IDs, values are state objects.';
