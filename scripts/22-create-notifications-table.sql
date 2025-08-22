-- Create notifications table for user-admin messaging system
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    message text NOT NULL,
    is_read boolean DEFAULT false,
    is_broadcast boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON public.notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_broadcast ON public.notifications(is_broadcast);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read notifications sent to them
CREATE POLICY "Users can read their own notifications" ON public.notifications
    FOR SELECT USING (recipient_id = auth.uid());

-- Users can send notifications to admin (assuming admin has specific email)
CREATE POLICY "Users can send notifications to admin" ON public.notifications
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND 
        recipient_id IN (
            SELECT id FROM public.users 
            WHERE email = 'acmyma@gmail.com'
        )
    );

-- Admin can read all notifications
CREATE POLICY "Admin can read all notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND email = 'acmyma@gmail.com'
        )
    );

-- Admin can send notifications to any user
CREATE POLICY "Admin can send notifications to users" ON public.notifications
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND email = 'acmyma@gmail.com'
        )
    );

-- Admin can update notification read status
CREATE POLICY "Admin can update all notifications" ON public.notifications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND email = 'acmyma@gmail.com'
        )
    );

-- Users can update their own notification read status
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (recipient_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
