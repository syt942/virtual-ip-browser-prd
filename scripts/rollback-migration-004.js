#!/usr/bin/env node
/**
 * Database Migration 004 Rollback Script
 * 
 * This script removes the performance indexes added by migration 004
 * and removes the migration record from schema_migrations.
 * 
 * Usage:
 *   node rollback-migration-004.js
 *   node rollback-migration-004.js --dry-run
 *   node rollback-migration-004.js --db-path /custom/path/to/db
 * 
 * Options:
 *   --dry-run    Show what would be done without making changes
 *   --db-path    Specify custom database path
 *   --help       Show this help message
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const helpRequested = args.includes('--help') || args.includes('-h');

// Custom database path
let customDbPath = null;
const dbPathIndex = args.indexOf('--db-path');
if (dbPathIndex !== -1 && args[dbPathIndex + 1]) {
  customDbPath = args[dbPathIndex + 1];
}

// Show help
if (helpRequested) {
  console.log(`
Database Migration 004 Rollback Script

This script removes the performance indexes added by migration 004.

Usage:
  node rollback-migration-004.js [options]

Options:
  --dry-run    Show what would be done without making changes
  --db-path    Specify custom database path
  --help, -h   Show this help message

Examples:
  node rollback-migration-004.js
  node rollback-migration-004.js --dry-run
  node rollback-migration-004.js --db-path ~/.config/virtual-ip-browser/virtual-ip-browser.db
`);
  process.exit(0);
}

// Determine config directory based on platform
function getConfigDir() {
  const platform = process.platform;
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'darwin':
      return path.join(homeDir, 'Library', 'Application Support', 'virtual-ip-browser');
    case 'win32':
      return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'virtual-ip-browser');
    default:
      return path.join(homeDir, '.config', 'virtual-ip-browser');
  }
}

// Rollback SQL statements
const ROLLBACK_SQL = `
-- Drop all indexes added by migration 004
DROP INDEX IF EXISTS idx_search_tasks_proxy_id;
DROP INDEX IF EXISTS idx_proxy_usage_composite;
DROP INDEX IF EXISTS idx_rotation_events_composite;
DROP INDEX IF EXISTS idx_activity_logs_composite;
DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup;

-- Remove migration record
DELETE FROM schema_migrations WHERE version = '004';
`;

// Individual statements for better error handling
const ROLLBACK_STATEMENTS = [
  { sql: 'DROP INDEX IF EXISTS idx_search_tasks_proxy_id', desc: 'Dropping idx_search_tasks_proxy_id' },
  { sql: 'DROP INDEX IF EXISTS idx_proxy_usage_composite', desc: 'Dropping idx_proxy_usage_composite' },
  { sql: 'DROP INDEX IF EXISTS idx_rotation_events_composite', desc: 'Dropping idx_rotation_events_composite' },
  { sql: 'DROP INDEX IF EXISTS idx_activity_logs_composite', desc: 'Dropping idx_activity_logs_composite' },
  { sql: 'DROP INDEX IF EXISTS idx_sticky_sessions_domain_lookup', desc: 'Dropping idx_sticky_sessions_domain_lookup' },
  { sql: "DELETE FROM schema_migrations WHERE version = '004'", desc: 'Removing migration 004 record' },
];

async function main() {
  console.log('==========================================');
  console.log('Database Migration 004 Rollback');
  console.log('==========================================');
  console.log('');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
    console.log('');
  }
  
  // Determine database path
  const configDir = getConfigDir();
  const dbPath = customDbPath || path.join(configDir, 'virtual-ip-browser.db');
  
  console.log(`Platform: ${process.platform}`);
  console.log(`Database: ${dbPath}`);
  console.log('');
  
  // Check if database exists
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Error: Database not found at ${dbPath}`);
    console.error('');
    console.error('Please specify the correct path using --db-path');
    process.exit(1);
  }
  
  // Try to load better-sqlite3
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (error) {
    console.error('❌ Error: better-sqlite3 not found');
    console.error('');
    console.error('Please install it first:');
    console.error('  npm install better-sqlite3');
    console.error('');
    console.error('Or run this script from the virtual-ip-browser-prd directory:');
    console.error('  cd virtual-ip-browser-prd && node scripts/rollback-migration-004.js');
    process.exit(1);
  }
  
  // Open database
  let db;
  try {
    db = new Database(dbPath);
    console.log('✓ Database opened successfully');
  } catch (error) {
    console.error(`❌ Error opening database: ${error.message}`);
    process.exit(1);
  }
  
  try {
    // Check current migration status
    console.log('');
    console.log('Current migration status:');
    
    const migrations = db.prepare('SELECT version, name, applied_at FROM schema_migrations ORDER BY version').all();
    
    if (migrations.length === 0) {
      console.log('  No migrations found in database');
    } else {
      migrations.forEach(m => {
        const marker = m.version === '004' ? ' ← will be removed' : '';
        console.log(`  ${m.version}: ${m.name} (${m.applied_at})${marker}`);
      });
    }
    
    const migration004 = migrations.find(m => m.version === '004');
    if (!migration004) {
      console.log('');
      console.log('⚠️  Migration 004 is not applied. Nothing to rollback.');
      db.close();
      process.exit(0);
    }
    
    // Check existing indexes
    console.log('');
    console.log('Indexes to be removed:');
    
    const indexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' 
      AND name IN (
        'idx_search_tasks_proxy_id',
        'idx_proxy_usage_composite',
        'idx_rotation_events_composite',
        'idx_activity_logs_composite',
        'idx_sticky_sessions_domain_lookup'
      )
    `).all();
    
    if (indexes.length === 0) {
      console.log('  No migration 004 indexes found');
    } else {
      indexes.forEach(idx => {
        console.log(`  ✓ ${idx.name}`);
      });
    }
    
    // Dry run - just show what would happen
    if (isDryRun) {
      console.log('');
      console.log('Would execute the following statements:');
      console.log('');
      ROLLBACK_STATEMENTS.forEach(stmt => {
        console.log(`  ${stmt.desc}`);
        console.log(`    ${stmt.sql}`);
      });
      console.log('');
      console.log('Run without --dry-run to apply these changes.');
      db.close();
      process.exit(0);
    }
    
    // Confirm before proceeding
    console.log('');
    console.log('⚠️  This will remove migration 004 indexes.');
    console.log('   Query performance may be affected.');
    console.log('');
    
    // Create backup
    const backupPath = `${dbPath}.backup-${Date.now()}`;
    console.log(`Creating backup: ${backupPath}`);
    db.backup(backupPath);
    console.log('✓ Backup created');
    
    // Execute rollback
    console.log('');
    console.log('Executing rollback...');
    
    const transaction = db.transaction(() => {
      for (const stmt of ROLLBACK_STATEMENTS) {
        console.log(`  ${stmt.desc}...`);
        db.exec(stmt.sql);
        console.log(`    ✓ Done`);
      }
    });
    
    transaction();
    
    console.log('');
    console.log('✓ Rollback completed successfully');
    
    // Verify
    console.log('');
    console.log('Verification:');
    
    const remainingIndexes = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' 
      AND name IN (
        'idx_search_tasks_proxy_id',
        'idx_proxy_usage_composite',
        'idx_rotation_events_composite',
        'idx_activity_logs_composite',
        'idx_sticky_sessions_domain_lookup'
      )
    `).all();
    
    console.log(`  Indexes remaining: ${remainingIndexes.length}`);
    
    const migration004After = db.prepare("SELECT * FROM schema_migrations WHERE version = '004'").get();
    console.log(`  Migration 004 record: ${migration004After ? 'still exists ⚠️' : 'removed ✓'}`);
    
  } catch (error) {
    console.error('');
    console.error(`❌ Rollback failed: ${error.message}`);
    console.error('');
    console.error('The database backup was created before changes were attempted.');
    process.exit(1);
  } finally {
    db.close();
  }
  
  console.log('');
  console.log('==========================================');
  console.log('Rollback complete');
  console.log('==========================================');
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
