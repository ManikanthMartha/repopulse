-- Migration: Add GitHub OAuth support and repo limits
-- Run this migration after init.sql

-- Add GitHub token storage and repo limit to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS github_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS github_token_iv TEXT,
ADD COLUMN IF NOT EXISTS github_username TEXT,
ADD COLUMN IF NOT EXISTS repo_limit INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT FALSE;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_github_username ON users(github_username);

-- Track OAuth state for security (prevent CSRF)
CREATE TABLE IF NOT EXISTS oauth_states (
    id SERIAL PRIMARY KEY,
    state TEXT UNIQUE NOT NULL,
    telegram_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Clean up expired states periodically
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
