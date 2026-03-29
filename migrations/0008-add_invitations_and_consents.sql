-- Migration: 0008_add_invitations_and_consents
-- Description: Create invitations and user_consents tables
-- Created: 2026-03-29

-- Create invitations table to track sent invitations
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for invitations
CREATE POLICY "Users can view their own sent invitations" ON public.invitations
    FOR SELECT USING (invited_by = auth.uid());

CREATE POLICY "Users can insert invitations" ON public.invitations
    FOR INSERT WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Service role can manage all invitations" ON public.invitations
    FOR ALL USING (auth.role() = 'service_role');

-- Create user_consents table to track legal agreement acceptance
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  eula_accepted_at TIMESTAMP WITH TIME ZONE,
  privacy_accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);

-- Add RLS policies
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Permissive policy pattern
CREATE POLICY "permissive_user_consents_policy" ON user_consents
  FOR ALL USING (( SELECT auth.uid() AS uid) IS NOT NULL);
