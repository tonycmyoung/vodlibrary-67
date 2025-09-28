-- Drop the unnecessary video_view_stats view
-- This view was created but is not needed - we'll query video_views directly

DROP VIEW IF EXISTS video_view_stats;
