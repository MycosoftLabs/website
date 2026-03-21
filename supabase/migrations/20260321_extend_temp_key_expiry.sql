-- Extend agent_temp_keys expiration from 15 minutes to 72 hours.
-- 15 minutes was too aggressive — network issues, slow agents, or browser
-- disconnects during payment could cause permanent key loss.
ALTER TABLE public.agent_temp_keys
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '72 hours');
