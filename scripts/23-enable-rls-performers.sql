-- Enable RLS and create policies for performers and video_performers tables

-- Enable RLS on performers table
ALTER TABLE public.performers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on video_performers table  
ALTER TABLE public.video_performers ENABLE ROW LEVEL SECURITY;

-- Performers table policies
-- Allow authenticated users to read performers
CREATE POLICY "Allow authenticated users to read performers" ON public.performers
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow admins to manage performers
CREATE POLICY "Allow admins to manage performers" ON public.performers
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_approved = true
        )
    );

-- Video_performers table policies  
-- Allow authenticated users to read video-performer relationships
CREATE POLICY "Allow authenticated users to read video_performers" ON public.video_performers
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Allow admins to manage video-performer relationships
CREATE POLICY "Allow admins to manage video_performers" ON public.video_performers
    FOR ALL 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin' 
            AND users.is_approved = true
        )
    );
