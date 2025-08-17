-- Verify complete deletion of acmyau@gmail.com user
-- Check all tables for any remaining references

-- Check users table
SELECT 'users table' as table_name, COUNT(*) as record_count 
FROM users 
WHERE email = 'acmyau@gmail.com';

-- Check for any records that might reference this email in other potential tables
-- (Add more checks here if there are other tables that might reference users)

-- Summary
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM users WHERE email = 'acmyau@gmail.com') = 0 
    THEN 'SUCCESS: No records found for acmyau@gmail.com - deletion appears complete'
    ELSE 'WARNING: Found remaining records for acmyau@gmail.com - deletion incomplete'
  END as deletion_status;

-- Show all users for reference
SELECT 'All remaining users:' as info;
SELECT id, email, full_name, is_approved, role, created_at 
FROM users 
ORDER BY created_at DESC;
