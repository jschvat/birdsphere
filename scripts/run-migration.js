#!/usr/bin/env node

/**
 * Migration Runner Script
 *
 * This script runs the consolidated migration against your database.
 * It can be used for both development and production deployments.
 *
 * Usage:
 *   node scripts/run-migration.js                    # Run on default database
 *   node scripts/run-migration.js --database test    # Run on specific database
 *   node scripts/run-migration.js --dry-run          # Show what would be executed
 *   node scripts/run-migration.js --backup-first     # Create backup before migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const MIGRATION_FILE = path.join(__dirname, '../src/migrations/consolidated_migration.sql');

class MigrationRunner {
  constructor(databaseName = null) {
    this.dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: databaseName || process.env.DB_NAME || 'birdsphere',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    };
    this.pool = null;
  }

  async connect() {
    this.pool = new Pool(this.dbConfig);
    try {
      await this.pool.query('SELECT 1');
      console.log(`✅ Connected to database '${this.dbConfig.database}'`);
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  async checkMigrationStatus() {
    try {
      console.log('🔍 Checking current database state...');

      // Check if tables exist
      const tables = await this.pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('users', 'animal_categories', 'user_animal_interests', 'user_ratings')
      `);

      const existingTables = tables.rows.map(row => row.table_name);
      console.log('📋 Existing tables:', existingTables.length > 0 ? existingTables : 'None');

      // Check if animal_categories has data
      if (existingTables.includes('animal_categories')) {
        const categoryCount = await this.pool.query('SELECT COUNT(*) as count FROM animal_categories');
        console.log(`🐾 Animal categories: ${categoryCount.rows[0].count}`);
      }

      // Check if users table has new columns
      if (existingTables.includes('users')) {
        const userColumns = await this.pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'users'
          AND column_name IN ('user_roles', 'rating', 'rating_count', 'address_street')
        `);
        const newColumns = userColumns.rows.map(row => row.column_name);
        console.log('🆕 New user columns:', newColumns.length > 0 ? newColumns : 'None');
      }

      return {
        hasBaseTables: existingTables.length > 0,
        hasMigrationTables: existingTables.includes('animal_categories'),
        tables: existingTables
      };

    } catch (error) {
      console.error('❌ Failed to check migration status:', error.message);
      throw error;
    }
  }

  async createBackup() {
    try {
      console.log('💾 Creating database backup...');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(__dirname, `../backups/backup-${this.dbConfig.database}-${timestamp}.sql`);

      // Create backups directory if it doesn't exist
      const backupsDir = path.dirname(backupFile);
      if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
      }

      // Use pg_dump to create backup
      const { spawn } = require('child_process');

      return new Promise((resolve, reject) => {
        const pgDump = spawn('pg_dump', [
          '-h', this.dbConfig.host,
          '-p', this.dbConfig.port,
          '-U', this.dbConfig.user,
          '-d', this.dbConfig.database,
          '-f', backupFile,
          '--verbose'
        ], {
          env: { ...process.env, PGPASSWORD: this.dbConfig.password }
        });

        pgDump.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ Backup created: ${backupFile}`);
            resolve(backupFile);
          } else {
            reject(new Error(`pg_dump failed with code ${code}`));
          }
        });

        pgDump.on('error', (error) => {
          console.log('⚠️  pg_dump not available, skipping backup');
          resolve(null);
        });
      });

    } catch (error) {
      console.error('❌ Failed to create backup:', error.message);
      return null;
    }
  }

  async runMigration(dryRun = false) {
    try {
      console.log('📜 Reading migration file...');
      const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

      if (dryRun) {
        console.log('\n🔍 DRY RUN - Migration SQL:');
        console.log('=' .repeat(80));
        console.log(migrationSQL.substring(0, 1000) + '...');
        console.log('=' .repeat(80));
        console.log('✅ Dry run completed - no changes made');
        return;
      }

      console.log('🚀 Running consolidated migration...');
      const startTime = Date.now();

      // Begin transaction
      await this.pool.query('BEGIN');

      try {
        await this.pool.query(migrationSQL);
        await this.pool.query('COMMIT');

        const duration = Date.now() - startTime;
        console.log(`✅ Migration completed successfully in ${duration}ms`);

      } catch (error) {
        await this.pool.query('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async verifyMigration() {
    try {
      console.log('🔍 Verifying migration results...');

      // Check tables exist
      const tables = await this.pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log('📋 Database tables:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });

      // Check animal categories
      const categoryCount = await this.pool.query('SELECT COUNT(*) as count FROM animal_categories');
      const levelCounts = await this.pool.query(`
        SELECT level, COUNT(*) as count
        FROM animal_categories
        GROUP BY level
        ORDER BY level
      `);

      console.log(`\n🐾 Animal categories: ${categoryCount.rows[0].count} total`);
      levelCounts.rows.forEach(row => {
        console.log(`   Level ${row.level}: ${row.count} categories`);
      });

      // Check indexes
      const indexes = await this.pool.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      `);

      console.log(`\n📊 Performance indexes: ${indexes.rows.length}`);

      // Check functions
      const functions = await this.pool.query(`
        SELECT routine_name
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
      `);

      console.log(`\n⚙️  Functions: ${functions.rows.length}`);

      console.log('\n✅ Migration verification completed successfully');

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }

  async cleanup() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const databaseName = args.includes('--database') ? args[args.indexOf('--database') + 1] : null;
  const dryRun = args.includes('--dry-run');
  const backupFirst = args.includes('--backup-first');

  const runner = new MigrationRunner(databaseName);

  try {
    console.log('🚀 Starting database migration...\n');

    await runner.connect();
    const status = await runner.checkMigrationStatus();

    if (backupFirst && status.hasBaseTables) {
      await runner.createBackup();
    }

    await runner.runMigration(dryRun);

    if (!dryRun) {
      await runner.verifyMigration();
    }

    console.log('\n🎉 Migration completed successfully!');

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Database Migration Runner

Usage:
  node scripts/run-migration.js                       # Run on default database
  node scripts/run-migration.js --database test       # Run on specific database
  node scripts/run-migration.js --dry-run             # Show what would be executed
  node scripts/run-migration.js --backup-first        # Create backup before migration
  node scripts/run-migration.js --help                # Show this help

Environment Variables:
  DB_HOST     - PostgreSQL host (default: localhost)
  DB_PORT     - PostgreSQL port (default: 5432)
  DB_NAME     - PostgreSQL database (default: birdsphere)
  DB_USER     - PostgreSQL user (default: postgres)
  DB_PASSWORD - PostgreSQL password (default: password)
  `);
  process.exit(0);
}

// Run the migration
main();