-- Virtual IP Browser Database Schema
-- SQLite Database for storing proxy configs, sessions, and activity logs

-- Proxies Table
CREATE TABLE IF NOT EXISTS proxies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
  protocol TEXT NOT NULL CHECK (protocol IN ('http', 'https', 'socks4', 'socks5')),
  username TEXT,
  password TEXT,
  status TEXT DEFAULT 'checking' CHECK (status IN ('active', 'failed', 'checking', 'disabled')),
  latency INTEGER,
  last_checked DATETIME,
  failure_count INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  region TEXT,
  tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(host, port, protocol)
);

CREATE INDEX IF NOT EXISTS idx_proxies_status ON proxies(status);
CREATE INDEX IF NOT EXISTS idx_proxies_region ON proxies(region);

-- Search Tasks Table
CREATE TABLE IF NOT EXISTS search_tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine IN ('google', 'bing', 'duckduckgo', 'yahoo', 'brave')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  proxy_id TEXT,
  tab_id TEXT,
  position INTEGER,
  results TEXT,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proxy_id) REFERENCES proxies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_search_tasks_session ON search_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_search_tasks_status ON search_tasks(status);
CREATE INDEX IF NOT EXISTS idx_search_tasks_keyword ON search_tasks(keyword);

-- Target Domains Table
CREATE TABLE IF NOT EXISTS target_domains (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  pattern TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_visited DATETIME,
  visit_count INTEGER DEFAULT 0,
  avg_position REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_target_domains_enabled ON target_domains(enabled);
CREATE INDEX IF NOT EXISTS idx_target_domains_priority ON target_domains(priority DESC);

-- Creators Table
CREATE TABLE IF NOT EXISTS creators (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('youtube', 'twitch', 'blog', 'website')),
  thumbnail_url TEXT,
  support_methods TEXT,
  enabled INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  last_supported DATETIME,
  total_supports INTEGER DEFAULT 0,
  total_ads_viewed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creators_enabled ON creators(enabled);
CREATE INDEX IF NOT EXISTS idx_creators_platform ON creators(platform);

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error', 'success')),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  session_id TEXT,
  tab_id TEXT,
  proxy_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_session ON activity_logs(session_id);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tabs TEXT,
  window_bounds TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK (type IN ('one-time', 'recurring', 'continuous', 'custom')),
  task_config TEXT NOT NULL,
  start_time DATETIME,
  end_time DATETIME,
  interval_minutes INTEGER,
  days_of_week TEXT,
  cron_expression TEXT,
  enabled INTEGER DEFAULT 1,
  last_run DATETIME,
  next_run DATETIME,
  run_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON schedules(next_run);
