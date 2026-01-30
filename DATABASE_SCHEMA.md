# Virtual IP Browser Database Schema

This document describes the SQLite database schema used by the Virtual IP Browser application.

## Overview

The database uses SQLite with WAL (Write-Ahead Logging) mode for better performance and foreign key support enabled. All migrations are embedded in the application for packaged app compatibility.

## Tables

### Core Tables

#### `proxies`
Stores proxy server configurations and their status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique proxy identifier |
| `name` | TEXT | NOT NULL | Display name for the proxy |
| `host` | TEXT | NOT NULL | Proxy server hostname/IP |
| `port` | INTEGER | NOT NULL, CHECK (1-65535) | Proxy server port |
| `protocol` | TEXT | NOT NULL, CHECK IN ('http', 'https', 'socks4', 'socks5') | Protocol type |
| `username` | TEXT | | Authentication username |
| `password` | TEXT | | Authentication password |
| `status` | TEXT | DEFAULT 'checking', CHECK IN ('active', 'failed', 'checking', 'disabled') | Current status |
| `latency` | INTEGER | | Last measured latency in ms |
| `last_checked` | DATETIME | | Last health check timestamp |
| `failure_count` | INTEGER | DEFAULT 0 | Consecutive failure count |
| `total_requests` | INTEGER | DEFAULT 0 | Total requests through this proxy |
| `success_rate` | REAL | DEFAULT 0 | Success rate (0-100) |
| `region` | TEXT | | Geographic region |
| `tags` | TEXT | | JSON array of tags |
| `weight` | REAL | DEFAULT 1.0, CHECK (0-100) | Weight for weighted rotation |
| `rotation_group` | TEXT | | Group name for rotation strategies |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_proxies_status` - Status lookups
- `idx_proxies_region` - Region filtering
- `idx_proxies_rotation_group` - Rotation group lookups
- `idx_proxies_status_weight` - Weighted selection queries

---

#### `creators`
Stores content creator information for the creator support feature.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique creator identifier |
| `name` | TEXT | NOT NULL | Creator display name |
| `url` | TEXT | NOT NULL, UNIQUE | Creator's URL |
| `platform` | TEXT | NOT NULL, CHECK IN ('youtube', 'twitch', 'blog', 'website') | Platform type |
| `thumbnail_url` | TEXT | | Thumbnail image URL |
| `support_methods` | TEXT | | JSON array of support methods |
| `enabled` | INTEGER | DEFAULT 1 | Whether creator support is enabled |
| `priority` | INTEGER | DEFAULT 0 | Support priority |
| `last_supported` | DATETIME | | Last support action timestamp |
| `total_supports` | INTEGER | DEFAULT 0 | Total support actions count |
| `total_ads_viewed` | INTEGER | DEFAULT 0 | Total ads viewed count |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

**Indexes:**
- `idx_creators_enabled` - Enabled creators filter
- `idx_creators_platform` - Platform filtering

---

#### `creator_support_history`
Tracks all creator support actions (clicks, scrolls, visits).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique action identifier |
| `creator_id` | INTEGER | NOT NULL, FK → creators(id) ON DELETE CASCADE | Reference to creator |
| `action_type` | TEXT | NOT NULL, CHECK IN ('click', 'scroll', 'visit') | Type of support action |
| `target_url` | TEXT | | URL where action was performed |
| `timestamp` | INTEGER | NOT NULL | Unix timestamp of action |
| `session_id` | TEXT | | Session identifier |
| `proxy_id` | INTEGER | | Proxy used (if any) |
| `success` | INTEGER | NOT NULL, DEFAULT 1 | Whether action succeeded (0/1) |
| `error_message` | TEXT | | Error message if failed |
| `metadata` | TEXT | | JSON with additional context |

**Indexes:**
- `idx_creator_support_history_creator_id` - Creator lookups
- `idx_creator_support_history_timestamp` - Time-based queries
- `idx_creator_support_history_session_id` - Session lookups
- `idx_creator_support_history_creator_time` - Creator + time composite

**Triggers:**
- `trg_creator_support_update_last_supported` - Updates `creators.last_supported` and `total_supports` on successful action

---

#### `execution_logs`
Tracks execution of automated tasks (search, creator support, scheduled).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique execution identifier |
| `execution_type` | TEXT | NOT NULL, CHECK IN ('search', 'creator_support', 'scheduled') | Type of execution |
| `start_time` | INTEGER | NOT NULL | Unix timestamp of start |
| `end_time` | INTEGER | | Unix timestamp of end (NULL if running) |
| `status` | TEXT | NOT NULL, CHECK IN ('running', 'completed', 'failed', 'cancelled') | Current status |
| `keywords_processed` | INTEGER | | Keywords processed (search type) |
| `results_found` | INTEGER | | Results found (search type) |
| `creators_visited` | INTEGER | | Creators visited (creator_support type) |
| `proxy_rotations` | INTEGER | NOT NULL, DEFAULT 0 | Number of proxy rotations |
| `errors_count` | INTEGER | NOT NULL, DEFAULT 0 | Number of errors |
| `error_details` | TEXT | | JSON array of error details |
| `resource_usage` | TEXT | | JSON with CPU/memory usage |
| `metadata` | TEXT | | JSON with additional context |

**Indexes:**
- `idx_execution_logs_execution_type` - Type filtering
- `idx_execution_logs_start_time` - Time-based queries
- `idx_execution_logs_status` - Status filtering
- `idx_execution_logs_type_time` - Type + time composite
- `idx_execution_logs_status_time` - Status + time composite

---

### Search & Automation Tables

#### `search_tasks`
Stores search task queue and results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique task identifier |
| `session_id` | TEXT | NOT NULL | Session this task belongs to |
| `keyword` | TEXT | NOT NULL | Search keyword |
| `engine` | TEXT | NOT NULL, CHECK IN ('google', 'bing', 'duckduckgo', 'yahoo', 'brave') | Search engine |
| `status` | TEXT | NOT NULL, CHECK IN ('queued', 'running', 'completed', 'failed', 'cancelled') | Task status |
| `proxy_id` | TEXT | FK → proxies(id) ON DELETE SET NULL | Proxy used |
| `tab_id` | TEXT | | Browser tab ID |
| `position` | INTEGER | | Result position found |
| `results` | TEXT | | JSON search results |
| `error` | TEXT | | Error message if failed |
| `retry_count` | INTEGER | DEFAULT 0 | Number of retries |
| `start_time` | DATETIME | | Task start time |
| `end_time` | DATETIME | | Task end time |
| `duration` | INTEGER | | Duration in milliseconds |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

**Indexes:**
- `idx_search_tasks_session` - Session lookups
- `idx_search_tasks_status` - Status filtering
- `idx_search_tasks_keyword` - Keyword searches

---

#### `target_domains`
Stores target domains for domain-specific automation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique domain identifier |
| `domain` | TEXT | NOT NULL, UNIQUE | Domain name |
| `pattern` | TEXT | | URL pattern match |
| `enabled` | INTEGER | DEFAULT 1 | Whether enabled |
| `priority` | INTEGER | DEFAULT 0 | Visit priority |
| `last_visited` | DATETIME | | Last visit timestamp |
| `visit_count` | INTEGER | DEFAULT 0 | Total visit count |
| `avg_position` | REAL | | Average search position |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

#### `schedules`
Stores scheduled task configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique schedule identifier |
| `name` | TEXT | | Schedule display name |
| `type` | TEXT | NOT NULL, CHECK IN ('one-time', 'recurring', 'continuous', 'custom') | Schedule type |
| `task_config` | TEXT | NOT NULL | JSON task configuration |
| `start_time` | DATETIME | | Start time |
| `end_time` | DATETIME | | End time |
| `interval_minutes` | INTEGER | | Interval for recurring |
| `days_of_week` | TEXT | | Days for recurring (JSON) |
| `cron_expression` | TEXT | | Cron expression for custom |
| `enabled` | INTEGER | DEFAULT 1 | Whether enabled |
| `last_run` | DATETIME | | Last execution time |
| `next_run` | DATETIME | | Next scheduled run |
| `run_count` | INTEGER | DEFAULT 0 | Total run count |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

### Proxy Rotation System Tables

#### `rotation_configs`
Stores proxy rotation strategy configurations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique config identifier |
| `name` | TEXT | NOT NULL | Configuration name |
| `description` | TEXT | | Description |
| `strategy` | TEXT | NOT NULL, CHECK IN (various strategies) | Rotation strategy type |
| `is_active` | INTEGER | DEFAULT 0 | Whether currently active |
| `common_config` | TEXT | DEFAULT '{}' | JSON common settings |
| `strategy_config` | TEXT | DEFAULT '{}' | JSON strategy-specific settings |
| `target_group` | TEXT | | Target proxy group |
| `priority` | INTEGER | DEFAULT 0 | Config priority |
| `enabled` | INTEGER | DEFAULT 1 | Whether enabled |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| `created_by` | TEXT | | Creator identifier |

**Strategies:** `round-robin`, `random`, `least-used`, `fastest`, `sticky-session`, `geographic`, `failure-aware`, `time-based`, `weighted`, `custom`

---

#### `proxy_usage_stats`
Analytics and usage tracking for proxy rotation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique stats identifier |
| `proxy_id` | TEXT | NOT NULL, FK → proxies(id) ON DELETE CASCADE | Reference to proxy |
| `time_bucket` | DATETIME | NOT NULL | Time bucket for aggregation |
| `total_requests` | INTEGER | DEFAULT 0 | Total requests |
| `successful_requests` | INTEGER | DEFAULT 0 | Successful requests |
| `failed_requests` | INTEGER | DEFAULT 0 | Failed requests |
| `avg_latency_ms` | REAL | | Average latency |
| `min_latency_ms` | REAL | | Minimum latency |
| `max_latency_ms` | REAL | | Maximum latency |
| `p95_latency_ms` | REAL | | 95th percentile latency |
| `bytes_sent` | INTEGER | DEFAULT 0 | Bytes sent |
| `bytes_received` | INTEGER | DEFAULT 0 | Bytes received |
| `rotation_count` | INTEGER | DEFAULT 0 | Rotation count |
| `rotation_reasons` | TEXT | | JSON array of reasons |
| `error_counts` | TEXT | | JSON error counts by type |
| `last_error` | TEXT | | Last error message |
| `last_error_at` | DATETIME | | Last error timestamp |
| `target_countries` | TEXT | | JSON array of countries |
| `unique_domains` | INTEGER | DEFAULT 0 | Unique domains accessed |
| `unique_sessions` | INTEGER | DEFAULT 0 | Unique sessions |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

#### `encrypted_credentials`
Secure storage for proxy authentication credentials.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique credential identifier |
| `proxy_id` | TEXT | FK → proxies(id) ON DELETE CASCADE | Reference to proxy |
| `credential_name` | TEXT | NOT NULL | Credential name |
| `credential_type` | TEXT | NOT NULL, CHECK IN ('proxy_auth', 'api_key', 'oauth_token', 'certificate', 'ssh_key') | Type |
| `encrypted_username` | TEXT | | Encrypted username |
| `encrypted_password` | TEXT | | Encrypted password |
| `encrypted_data` | TEXT | | Encrypted additional data |
| `encryption_version` | INTEGER | DEFAULT 1 | Encryption version |
| `key_id` | TEXT | | Encryption key ID |
| `algorithm` | TEXT | DEFAULT 'aes-256-gcm' | Encryption algorithm |
| `provider` | TEXT | | Proxy provider |
| `expires_at` | DATETIME | | Expiration time |
| `last_rotated_at` | DATETIME | | Last rotation time |
| `rotation_required` | INTEGER | DEFAULT 0 | Whether rotation needed |
| `access_level` | TEXT | DEFAULT 'private', CHECK IN ('private', 'shared', 'admin') | Access level |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |
| `last_accessed_at` | DATETIME | | Last access timestamp |
| `access_count` | INTEGER | DEFAULT 0 | Access count |

---

#### `sticky_session_mappings`
Domain-to-proxy mappings for sticky session strategy.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique mapping identifier |
| `domain` | TEXT | NOT NULL | Domain name |
| `is_wildcard` | INTEGER | DEFAULT 0 | Whether wildcard match |
| `proxy_id` | TEXT | NOT NULL, FK → proxies(id) ON DELETE CASCADE | Assigned proxy |
| `config_id` | TEXT | FK → rotation_configs(id) ON DELETE CASCADE | Parent config |
| `ttl_seconds` | INTEGER | | Time-to-live |
| `expires_at` | DATETIME | | Expiration time |
| `request_count` | INTEGER | DEFAULT 0 | Request count |
| `last_used_at` | DATETIME | | Last use timestamp |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

#### `proxy_rotation_rules`
Custom rules for rule-based proxy rotation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique rule identifier |
| `config_id` | TEXT | NOT NULL, FK → rotation_configs(id) ON DELETE CASCADE | Parent config |
| `name` | TEXT | NOT NULL | Rule name |
| `description` | TEXT | | Rule description |
| `priority` | INTEGER | DEFAULT 0 | Rule priority |
| `conditions` | TEXT | NOT NULL, DEFAULT '[]' | JSON conditions array |
| `condition_logic` | TEXT | DEFAULT 'AND', CHECK IN ('AND', 'OR') | Condition logic |
| `actions` | TEXT | NOT NULL, DEFAULT '[]' | JSON actions array |
| `stop_on_match` | INTEGER | DEFAULT 1 | Stop on match flag |
| `enabled` | INTEGER | DEFAULT 1 | Whether enabled |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

#### `rotation_events`
Audit log for rotation events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique event identifier |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Event timestamp |
| `config_id` | TEXT | FK → rotation_configs(id) ON DELETE SET NULL | Config used |
| `previous_proxy_id` | TEXT | FK → proxies(id) ON DELETE SET NULL | Previous proxy |
| `new_proxy_id` | TEXT | FK → proxies(id) ON DELETE SET NULL | New proxy |
| `reason` | TEXT | NOT NULL, CHECK IN (various reasons) | Rotation reason |
| `domain` | TEXT | | Target domain |
| `url` | TEXT | | Target URL |
| `tab_id` | TEXT | | Browser tab ID |
| `session_id` | TEXT | | Session ID |
| `metadata` | TEXT | | JSON additional data |

**Reasons:** `scheduled`, `failure`, `manual`, `startup`, `rule_triggered`, `ttl_expired`, `cooldown`

---

### System Tables

#### `schema_migrations`
Tracks applied database migrations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Migration ID |
| `version` | TEXT | NOT NULL, UNIQUE | Version number |
| `name` | TEXT | NOT NULL | Migration name |
| `applied_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Application timestamp |
| `checksum` | TEXT | | Migration checksum |

---

#### `activity_logs`
Application activity logging.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique log identifier |
| `timestamp` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Log timestamp |
| `level` | TEXT | NOT NULL, CHECK IN ('debug', 'info', 'warning', 'error', 'success') | Log level |
| `category` | TEXT | NOT NULL | Log category |
| `message` | TEXT | NOT NULL | Log message |
| `metadata` | TEXT | | JSON additional data |
| `session_id` | TEXT | | Session ID |
| `tab_id` | TEXT | | Tab ID |
| `proxy_id` | TEXT | | Proxy ID |

---

#### `sessions`
Browser session storage.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Unique session identifier |
| `name` | TEXT | NOT NULL | Session name |
| `tabs` | TEXT | | JSON tabs data |
| `window_bounds` | TEXT | | JSON window bounds |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update timestamp |

---

## Views

### `v_proxy_current_stats`
Active proxies with their current stats (last 24 hours).

### `v_rotation_configs_summary`
Rotation configs with rule and mapping counts.

### `v_creator_support_stats`
Creator support statistics aggregated by creator.

### `v_execution_summary`
Execution statistics aggregated by execution type.

---

## Migrations

| Version | Name | Description |
|---------|------|-------------|
| 001 | proxy_rotation_system | Adds proxy rotation system tables |
| 002 | creator_support_and_execution_logs | Adds creator support history and execution logs tables |

---

## Repository Classes

The following repository classes provide database access:

- `ProxyRepository` - Proxy management with rotation extensions
- `RotationConfigRepository` - Rotation configuration CRUD
- `ProxyUsageStatsRepository` - Usage statistics and analytics
- `EncryptedCredentialsRepository` - Secure credential storage
- `StickySessionRepository` - Sticky session mapping management
- `RotationEventsRepository` - Rotation event logging
- `RotationRulesRepository` - Custom rotation rules
- `CreatorSupportHistoryRepository` - Creator support action tracking
- `ExecutionLogsRepository` - Execution tracking and analytics

---

## Best Practices

### Indexing Strategy
- All foreign keys are indexed for efficient JOINs
- Composite indexes for common query patterns (e.g., `creator_id + timestamp`)
- Descending indexes on timestamp columns for recent-first queries

### Data Types
- `INTEGER` for IDs with AUTOINCREMENT where appropriate
- `TEXT` for flexible string storage
- `INTEGER` for Unix timestamps (efficient storage and comparison)
- JSON stored as `TEXT` for flexible metadata

### Constraints
- CHECK constraints for enum-like columns
- Foreign keys with appropriate ON DELETE actions
- NOT NULL where data is required

### Performance
- WAL mode enabled for concurrent reads
- Automatic triggers for maintaining denormalized counts
- Views for common aggregations
