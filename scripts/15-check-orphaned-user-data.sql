-- Check for any orphaned data related to acmyau@gmail.com
-- This will help identify if incomplete deletion is causing issues

SELECT 'Checking users table' as check_type;
SELECT * FROM users WHERE email = 'acmyau@gmail.com';

SELECT 'Checking user_favorites table' as check_type;
SELECT uf.*, u.email FROM user_favorites uf 
LEFT JOIN users u ON uf.user_id = u.id 
WHERE u.email = 'acmyau@gmail.com' OR u.email IS NULL;

SELECT 'Checking videos created by user' as check_type;
SELECT v.*, u.email FROM videos v 
LEFT JOIN users u ON v.created_by = u.id 
WHERE u.email = 'acmyau@gmail.com' OR u.email IS NULL;

SELECT 'Checking categories created by user' as check_type;
SELECT c.*, u.email FROM categories c 
LEFT JOIN users u ON c.created_by = u.id 
WHERE u.email = 'acmyau@gmail.com' OR u.email IS NULL;

SELECT 'Summary of potential orphaned records' as check_type;
SELECT 
  (SELECT COUNT(*) FROM user_favorites WHERE user_id NOT IN (SELECT id FROM users)) as orphaned_favorites,
  (SELECT COUNT(*) FROM videos WHERE created_by NOT IN (SELECT id FROM users)) as orphaned_videos,
  (SELECT COUNT(*) FROM categories WHERE created_by NOT IN (SELECT id FROM users)) as orphaned_categories;
