/**
 * Embedded SQL Migrations Index
 * Exports all embedded migration SQL files
 */

import { MIGRATION_001_SQL } from './001-proxy-rotation.sql';
import { MIGRATION_002_SQL } from './002-creator-support.sql';

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
  }
];

export { MIGRATION_001_SQL, MIGRATION_002_SQL };
