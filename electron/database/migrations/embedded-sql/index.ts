/**
 * Embedded SQL Migrations Index
 * Exports all embedded migration SQL files
 */

import { MIGRATION_001_SQL } from './001-proxy-rotation.sql';
import { MIGRATION_002_SQL } from './002-creator-support.sql';
import { MIGRATION_004_SQL } from './004-performance-indexes.sql';
import { MIGRATION_005_SQL } from './005-encrypt-proxy-passwords.sql';
import { MIGRATION_006_SQL } from './006-search-keywords.sql';

export interface EmbeddedMigration {
  version: string;
  name: string;
  sql: string;
}

export const EMBEDDED_MIGRATIONS: EmbeddedMigration[] = [
  {
    version: '001',
    name: 'proxy_rotation_system',
    sql: MIGRATION_001_SQL
  },
  {
    version: '002',
    name: 'creator_support_and_execution_logs',
    sql: MIGRATION_002_SQL
  },
  {
    version: '004',
    name: 'add_performance_indexes',
    sql: MIGRATION_004_SQL
  },
  {
    version: '005',
    name: 'encrypt_proxy_passwords',
    sql: MIGRATION_005_SQL
  },
  {
    version: '006',
    name: 'search_keywords',
    sql: MIGRATION_006_SQL
  }
];

export { MIGRATION_001_SQL, MIGRATION_002_SQL, MIGRATION_004_SQL, MIGRATION_005_SQL, MIGRATION_006_SQL };
