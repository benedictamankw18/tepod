-- 0010_user_photo.sql
-- Profile picture for users, shown as an avatar in the sidebar/topbar.
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
