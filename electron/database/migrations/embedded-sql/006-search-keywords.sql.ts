/**
 * Migration 006: Search Keywords Table
 * 
 * PRD SA-001 Acceptance Criterion #10: "Queue persists across restarts"
 * Technical Notes: "Store queue in SQLite for persistence"
 * 
 * Creates the search_keywords table for persisting keyword queue state
 * across application restarts.
 */

export const MIGRATION_006_SQL = `
-- ============================================================================
-- Migration 006: Search Keywords Table (PRD SA-001 #10)
-- ============================================================================

-- Search Keywords Table for queue persistence
CREATE TABLE IF NOT EXISTS search_keywords (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata TEXT,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient session-based queries
CREATE INDEX IF NOT EXISTS idx_search_keywords_session ON search_keywords(session_id);

-- Index for status filtering (pending keywords for processing)
CREATE INDEX IF NOT EXISTS idx_search_keywords_status ON search_keywords(status);

-- Index for priority-based ordering within a session
CREATE INDEX IF NOT EXISTS idx_search_keywords_priority ON search_keywords(session_id, priority DESC);

-- Composite index for session + status queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_search_keywords_session_status ON search_keywords(session_id, status);

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('006', 'search_keywords', 'auto');
`;
