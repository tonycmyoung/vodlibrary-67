-- Clean up orphaned realtime subscriptions
-- This will remove all existing realtime subscriptions that are consuming database resources

-- Delete all existing subscriptions
DELETE FROM realtime.subscription;

-- Reset the subscription sequence if it exists
SELECT setval('realtime.subscription_id_seq', 1, false);

-- Optional: Disable realtime for authenticated users if not needed
-- REVOKE USAGE ON SCHEMA realtime FROM authenticated;
-- REVOKE ALL ON ALL TABLES IN SCHEMA realtime FROM authenticated;

-- Verify cleanup
SELECT COUNT(*) as remaining_subscriptions FROM realtime.subscription;
