-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index on email for quick lookups
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);

-- Create index on submitted_at for sorting
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at ON contact_submissions(submitted_at DESC);

-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting (public can submit)
CREATE POLICY "Allow public insert" ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Create policy for selecting (only authenticated users can view)
CREATE POLICY "Allow authenticated read" ON contact_submissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create policy for updating (only authenticated users can update)
CREATE POLICY "Allow authenticated update" ON contact_submissions
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_submissions_updated_at();

-- Create a view for admin dashboard (optional)
CREATE OR REPLACE VIEW contact_submissions_summary AS
SELECT 
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN submitted_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h,
  COUNT(CASE WHEN submitted_at > NOW() - INTERVAL '7 days' THEN 1 END) as last_7d,
  COUNT(CASE WHEN submitted_at > NOW() - INTERVAL '30 days' THEN 1 END) as last_30d
FROM contact_submissions
GROUP BY status;
