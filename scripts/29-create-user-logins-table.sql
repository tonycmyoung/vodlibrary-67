-- Create table to track user login events
CREATE TABLE user_logins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

-- Add RLS policies
ALTER TABLE user_logins ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own login records
CREATE POLICY "Users can insert their own login records" ON user_logins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all login records
CREATE POLICY "Admins can view all login records" ON user_logins
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'Teacher' 
            AND users.is_approved = true
        )
    );

-- Create index for performance
CREATE INDEX idx_user_logins_user_id ON user_logins(user_id);
CREATE INDEX idx_user_logins_login_time ON user_logins(login_time);
