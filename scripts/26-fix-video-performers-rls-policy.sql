-- Fix RLS policies for video_performers table to match actual role system
-- The current policy looks for role = 'admin' but the system uses 'Teacher' for admins

-- Drop existing policies
DROP POLICY IF EXISTS "Allow admins to manage performers" ON public.performers;
DROP POLICY IF EXISTS "Allow admins to manage video_performers" ON public.video_performers;

-- Recreate policies with correct role check
-- Allow Teachers (who are admins) to manage performers
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

-- Allow Teachers (who are admins) to manage video-performer relationships
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
