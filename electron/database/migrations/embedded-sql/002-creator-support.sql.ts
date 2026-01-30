/**
 * Migration 002: Creator Support and Execution Logs
 * SQL for adding creator support history and execution logs tables
 */

export const MIGRATION_002_SQL = `
-- Migration: 002_creator_support_and_execution_logs
-- Description: Add creator support history and execution logs tables

-- CREATOR_SUPPORT_HISTORY TABLE
CREATE TABLE IF NOT EXISTS creator_support_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('click', 'scroll', 'visit')),
  target_url TEXT,
  timestamp INTEGER NOT NULL,
  session_id TEXT,
  proxy_id INTEGER,
  success INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  metadata TEXT,
  FOREIGN KEY (creator_id) REFERENCES creators(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_support_history_creator_id 
  ON creator_support_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_support_history_timestamp 
  ON creator_support_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_creator_support_history_session_id 
  ON creator_support_history(session_id);
CREATE INDEX IF NOT EXISTS idx_creator_support_history_creator_time 
  ON creator_support_history(creator_id, timestamp DESC);

-- EXECUTION_LOGS TABLE
CREATE TABLE IF NOT EXISTS execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  execution_type TEXT NOT NULL CHECK (execution_type IN ('search', 'creator_support', 'scheduled')),
  start_time INTEGER NOT NULL,
  end_time INTEGER,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  keywords_processed INTEGER,
  results_found INTEGER,
  creators_visited INTEGER,
  proxy_rotations INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  error_details TEXT,
  resource_usage TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_type 
  ON execution_logs(execution_type);
CREATE INDEX IF NOT EXISTS idx_execution_logs_start_time 
  ON execution_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status 
  ON execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_type_time 
  ON execution_logs(execution_type, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_execution_logs_status_time 
  ON execution_logs(status, start_time DESC);

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

-- Record migration
INSERT OR IGNORE INTO schema_migrations (version, name, checksum)
VALUES ('002', 'creator_support_and_execution_logs', 'initial');
`;
