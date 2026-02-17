-- Create support_tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'technical',
    'account',
    'feature',
    'bug',
    'security',
    'integration',
    'api',
    'data',
    'device',
    'other'
  )),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON public.support_tickets(email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_issue_type ON public.support_tickets(issue_type);

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

-- Create policy: Service role can do anything
CREATE POLICY "Service role has full access" ON public.support_tickets
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Create policy: Authenticated users can insert tickets
CREATE POLICY "Anyone can create tickets" ON public.support_tickets
  FOR INSERT
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();

-- Grant permissions
GRANT SELECT, INSERT ON public.support_tickets TO anon;
GRANT ALL ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

-- Add comment
COMMENT ON TABLE public.support_tickets IS 'Support tickets submitted through the support center';
