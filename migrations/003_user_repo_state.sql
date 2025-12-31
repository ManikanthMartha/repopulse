-- Migration: Change from global repo_state to per-user repo_state
-- This fixes the bug where multiple users tracking the same repo share state

-- Drop the old repo_state table
DROP TABLE IF EXISTS repo_state CASCADE;

-- Create new user_repo_state table (per-user, per-repo tracking)
CREATE TABLE IF NOT EXISTS user_repo_state (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  last_issue_check TIMESTAMP WITH TIME ZONE,
  last_pr_check TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (user_id, repo_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_repo_state_user ON user_repo_state(user_id);
CREATE INDEX IF NOT EXISTS idx_user_repo_state_repo ON user_repo_state(repo_id);
