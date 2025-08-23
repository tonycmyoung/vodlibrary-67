-- Fix RLS policies to use correct role for admin users
-- The admin user has role 'Teacher' not 'admin' in the database

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admins to manage performers" ON public.performers;
DROP POLICY IF EXISTS "Allow admins to manage video_performers" ON public.video_performers;

-- Recreate policies with correct role check
CREATE POLICY "Allow teachers to manage performers" ON public.performers
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Teacher' 
            AND users.is_approved = true
        )
    );

CREATE POLICY "Allow teachers to manage video_performers" ON public.video_performers
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Teacher' 
            AND users.is_approved = true
        )
    );
