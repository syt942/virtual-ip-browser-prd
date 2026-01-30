-- Migration: 002_creator_support_and_execution_logs
-- Description: Add creator support history and execution logs tables
-- Created: 2024
-- Backwards Compatible: Yes (additive changes only)

-- ============================================================
-- 1. CREATOR_SUPPORT_HISTORY TABLE
-- Tracks all creator support actions (clicks, scrolls, visits)
-- ============================================================
CREATE TABLE IF NOT EXISTS creator_support_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  
  -- Action details
  action_type TEXT NOT NULL CHECK (action_type IN ('click', 'scroll', 'visit')),
  target_url TEXT,
  timestamp INTEGER NOT NULL,
  session_id TEXT,
  
  -- Proxy used (nullable - may not use proxy)
  proxy_id INTEGER,
  
  -- Result tracking
  success INTEGER NOT NULL DEFAULT 1, -- SQLite boolean (0/1)
  error_message TEXT,
  
  -- Additional context (JSON)
  -- May include: duration, scroll_depth, ad_type, engagement_metrics
  metadata TEXT,
  
  -- Foreign key to creators table
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
-- Index on creator_id for looking up history by creator
CREATE INDEX IF NOT EXISTS idx_creator_support_history_creator_id 
  ON creator_support_history(creator_id);

-- Index on timestamp for time-range queries and cleanup
CREATE INDEX IF NOT EXISTS idx_creator_support_history_timestamp 
  ON creator_support_history(timestamp DESC);

-- Index on session_id for session-based queries
CREATE INDEX IF NOT EXISTS idx_creator_support_history_session_id 
  ON creator_support_history(session_id);

-- Composite index for filtering by creator and time
CREATE INDEX IF NOT EXISTS idx_creator_support_history_creator_time 
  ON creator_support_history(creator_id, timestamp DESC);

-- ============================================================
-- 2. EXECUTION_LOGS TABLE
-- Tracks execution of automated tasks (search, creator support, scheduled)
-- ============================================================
CREATE TABLE IF NOT EXISTS execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Execution type
  execution_type TEXT NOT NULL CHECK (execution_type IN ('search', 'creator_support', 'scheduled')),
  
  -- Timing
  start_time INTEGER NOT NULL,
  end_time INTEGER, -- NULL if still running
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  
  -- Task-specific metrics (nullable based on execution_type)
  keywords_processed INTEGER, -- For search executions
  results_found INTEGER, -- For search executions
  creators_visited INTEGER, -- For creator_support executions
  
  -- Common metrics
  proxy_rotations INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  
  -- Error details (JSON array of error objects)
  -- Format: [{ "timestamp": 123, "message": "...", "code": "..." }]
  error_details TEXT,
  
  -- Resource usage (JSON)
  -- Format: { "cpu": 45.2, "memory": 128.5 }
  resource_usage TEXT,
  
  -- Additional context (JSON)
  -- May include: config, trigger_source, user_id, etc.
  metadata TEXT
);

-- Indexes for efficient queries
-- Index on execution_type for filtering by type
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_type 
  ON execution_logs(execution_type);

-- Index on start_time for time-range queries and sorting
CREATE INDEX IF NOT EXISTS idx_execution_logs_start_time 
  ON execution_logs(start_time DESC);

-- Index on status for filtering active/completed executions
CREATE INDEX IF NOT EXISTS idx_execution_logs_status 
  ON execution_logs(status);

-- Composite index for type + time queries
CREATE INDEX IF NOT EXISTS idx_execution_logs_type_time 
  ON execution_logs(execution_type, start_time DESC);

-- Composite index for status + time queries (find recent failures)
CREATE INDEX IF NOT EXISTS idx_execution_logs_status_time 
  ON execution_logs(status, start_time DESC);

-- ============================================================
-- 3. TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================

-- Trigger: Update creators.last_supported when support action recorded
CREATE TRIGGER IF NOT EXISTS trg_creator_support_update_last_supported
AFTER INSERT ON creator_support_history
WHEN NEW.success = 1
BEGIN
  UPDATE creators 
  SET 
    last_supported = datetime(NEW.timestamp, 'unixepoch'),
    total_supports = total_supports + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.creator_id;
END;

-- ============================================================
-- 4. HELPER VIEWS
-- ============================================================

-- View: Creator support statistics
CREATE VIEW IF NOT EXISTS v_creator_support_stats AS
SELECT 
  c.id as creator_id,
  c.name as creator_name,
  c.platform,
  COUNT(csh.id) as total_actions,
  SUM(CASE WHEN csh.success = 1 THEN 1 ELSE 0 END) as successful_actions,
  SUM(CASE WHEN csh.success = 0 THEN 1 ELSE 0 END) as failed_actions,
  SUM(CASE WHEN csh.action_type = 'click' THEN 1 ELSE 0 END) as total_clicks,
  SUM(CASE WHEN csh.action_type = 'scroll' THEN 1 ELSE 0 END) as total_scrolls,
  SUM(CASE WHEN csh.action_type = 'visit' THEN 1 ELSE 0 END) as total_visits,
  MAX(csh.timestamp) as last_action_timestamp
FROM creators c
LEFT JOIN creator_support_history csh ON c.id = csh.creator_id
GROUP BY c.id;

-- View: Execution summary statistics
CREATE VIEW IF NOT EXISTS v_execution_summary AS
SELECT 
  execution_type,
  COUNT(*) as total_executions,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_count,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
  SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_count,
  AVG(CASE WHEN end_time IS NOT NULL THEN end_time - start_time END) as avg_duration_seconds,
  SUM(COALESCE(keywords_processed, 0)) as total_keywords_processed,
  SUM(COALESCE(results_found, 0)) as total_results_found,
  SUM(COALESCE(creators_visited, 0)) as total_creators_visited,
  SUM(proxy_rotations) as total_proxy_rotations,
  SUM(errors_count) as total_errors
FROM execution_logs
GROUP BY execution_type;

-- ============================================================
-- 5. RECORD MIGRATION
-- ============================================================
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('002', 'creator_support_and_execution_logs', 'initial');
