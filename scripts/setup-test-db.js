#!/usr/bin/env node

/**
 * Test Database Setup Script
 *
 * This script creates a temporary test database and runs the consolidated migration.
 * It's designed to be safe to run multiple times and allows testing migrations
 * without affecting the production database.
 *
 * Usage:
 *   node scripts/setup-test-db.js
 *   node scripts/setup-test-db.js --drop-first  # Drop existing test DB first
 *   node scripts/setup-test-db.js --clean       # Clean run (drop and recreate)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const TEST_DB_NAME = 'birdsphere_test';
const MIGRATION_FILE = path.join(__dirname, '../src/migrations/consolidated_migration.sql');

// Database connection configs
const adminConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Connect to default DB to create test DB
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: TEST_DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

class TestDatabaseSetup {
  constructor() {
    this.adminPool = null;
    this.testPool = null;
  }

  async connectToAdmin() {
    this.adminPool = new Pool(adminConfig);
    try {
      await this.adminPool.query('SELECT 1');
      console.log('✅ Connected to PostgreSQL admin database');
    } catch (error) {
      console.error('❌ Failed to connect to PostgreSQL:', error.message);
      throw error;
    }
  }

  async createTestDatabase() {
    try {
      // Check if test database exists
      const checkDb = await this.adminPool.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [TEST_DB_NAME]
      );

      if (checkDb.rows.length > 0) {
        console.log(`📋 Test database '${TEST_DB_NAME}' already exists`);

        if (process.argv.includes('--drop-first') || process.argv.includes('--clean')) {
          console.log(`🗑️  Dropping existing test database '${TEST_DB_NAME}'...`);

          // Terminate existing connections to the test database
          await this.adminPool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = $1 AND pid <> pg_backend_pid()
          `, [TEST_DB_NAME]);

          // Drop the database
          await this.adminPool.query(`DROP DATABASE ${TEST_DB_NAME}`);
          console.log(`✅ Dropped test database '${TEST_DB_NAME}'`);
        } else {
          console.log(`⚠️  Test database exists. Use --drop-first to recreate it.`);
          return false;
        }
      }

      // Create test database
      console.log(`🏗️  Creating test database '${TEST_DB_NAME}'...`);
      await this.adminPool.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`✅ Created test database '${TEST_DB_NAME}'`);
      return true;

    } catch (error) {
      console.error('❌ Failed to create test database:', error.message);
      throw error;
    }
  }

  async connectToTestDb() {
    this.testPool = new Pool(testDbConfig);
    try {
      await this.testPool.query('SELECT 1');
      console.log(`✅ Connected to test database '${TEST_DB_NAME}'`);
    } catch (error) {
      console.error('❌ Failed to connect to test database:', error.message);
      throw error;
    }
  }

  async createUsersTable() {
    // Create a basic users table for the migration to work with
    const createUsersSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) NOT NULL UNIQUE,
        phone VARCHAR(20),
        bio TEXT,
        profile_image VARCHAR(500),
        location_city VARCHAR(100),
        location_state VARCHAR(100),
        location_country VARCHAR(100),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_breeder BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `;

    try {
      await this.testPool.query(createUsersSQL);
      console.log('✅ Created base users table');
    } catch (error) {
      console.error('❌ Failed to create users table:', error.message);
      throw error;
    }
  }

  async runMigration() {
    try {
      console.log('📜 Reading migration file...');
      const migrationSQL = fs.readFileSync(MIGRATION_FILE, 'utf8');

      console.log('🚀 Running consolidated migration...');
      const startTime = Date.now();

      await this.testPool.query(migrationSQL);

      const duration = Date.now() - startTime;
      console.log(`✅ Migration completed successfully in ${duration}ms`);

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async verifyMigration() {
    try {
      console.log('🔍 Verifying migration results...');

      // Check tables exist
      const tables = await this.testPool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log('📋 Created tables:');
      tables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });

      // Check animal categories count
      const categoryCount = await this.testPool.query(
        'SELECT COUNT(*) as count FROM animal_categories'
      );
      console.log(`🐾 Animal categories: ${categoryCount.rows[0].count}`);

      // Check view exists
      const views = await this.testPool.query(`
        SELECT table_name
        FROM information_schema.views
        WHERE table_schema = 'public'
      `);

      if (views.rows.length > 0) {
        console.log('👁️  Created views:');
        views.rows.forEach(row => {
          console.log(`   - ${row.table_name}`);
        });
      }

      console.log('✅ Migration verification completed');

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }

  async generateTestReport() {
    try {
      console.log('\n📊 TEST DATABASE REPORT');
      console.log('=' .repeat(50));
      console.log(`Database: ${TEST_DB_NAME}`);
      console.log(`Host: ${testDbConfig.host}:${testDbConfig.port}`);
      console.log(`User: ${testDbConfig.user}`);

      // Get detailed table info
      const tableInfo = await this.testPool.query(`
        SELECT
          schemaname,
          tablename,
          tableowner,
          tablespace,
          hasindexes,
          hasrules,
          hastriggers
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      console.log('\n📋 Table Details:');
      for (const table of tableInfo.rows) {
        const rowCount = await this.testPool.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
        console.log(`   ${table.tablename}: ${rowCount.rows[0].count} rows`);
      }

      // Show sample categories
      const sampleCategories = await this.testPool.query(`
        SELECT level, name, icon
        FROM animal_categories
        WHERE level <= 2
        ORDER BY level, name
        LIMIT 10
      `);

      console.log('\n🐾 Sample Animal Categories:');
      sampleCategories.rows.forEach(cat => {
        console.log(`   Level ${cat.level}: ${cat.icon} ${cat.name}`);
      });

      console.log('\n✅ Test database is ready for use!');
      console.log(`\nTo connect: psql -h ${testDbConfig.host} -p ${testDbConfig.port} -U ${testDbConfig.user} -d ${TEST_DB_NAME}`);

    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
    }
  }

  async cleanup() {
    if (this.testPool) {
      await this.testPool.end();
    }
    if (this.adminPool) {
      await this.adminPool.end();
    }
  }
}

// Main execution
async function main() {
  const setup = new TestDatabaseSetup();

  try {
    console.log('🚀 Starting test database setup...\n');

    await setup.connectToAdmin();
    const created = await setup.createTestDatabase();

    await setup.connectToTestDb();
    await setup.createUsersTable();
    await setup.runMigration();
    await setup.verifyMigration();
    await setup.generateTestReport();

    console.log('\n🎉 Test database setup completed successfully!');

  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  } finally {
    await setup.cleanup();
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Test Database Setup Script

Usage:
  node scripts/setup-test-db.js                 # Create test DB and run migration
  node scripts/setup-test-db.js --drop-first    # Drop existing test DB first
  node scripts/setup-test-db.js --clean         # Clean run (drop and recreate)
  node scripts/setup-test-db.js --help          # Show this help

Environment Variables:
  DB_HOST     - PostgreSQL host (default: localhost)
  DB_PORT     - PostgreSQL port (default: 5432)
  DB_USER     - PostgreSQL user (default: postgres)
  DB_PASSWORD - PostgreSQL password (default: password)
  `);
  process.exit(0);
}

// Run the setup
main();