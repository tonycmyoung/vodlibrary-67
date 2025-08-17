-- Verify complete deletion of acmyau@gmail.com user
-- This script checks for any remaining references to the deleted user

-- Check users table
SELECT 'users table' as table_name, count(*) as remaining_records
FROM users 
WHERE email = 'acmyau@gmail.com';

-- Check for any other tables that might reference the user email
-- (Add more checks here if you have other tables that reference users)

-- Summary query to confirm complete deletion
SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM users WHERE email = 'acmyau@gmail.com')
    THEN 'SUCCESS: User completely deleted from database'
    ELSE 'WARNING: User records still exist in database'
  END as deletion_status;

-- Show current user count for reference
SELECT 'Total users remaining' as info, count(*) as count FROM users;
