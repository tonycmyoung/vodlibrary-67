-- Add invited_by column to users table to track who invited each user
ALTER TABLE public.users 
ADD COLUMN invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON public.users(invited_by);

-- Add comment to document the column
COMMENT ON COLUMN public.users.invited_by IS 'References the user who invited this user (if invited through the app)';
