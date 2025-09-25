#!/usr/bin/env node

/**
 * Database Migration Runner
 * Executes the posting system migration to fix schema issues
 */

const fs = require('fs');
const path = require('path');
const { pool, getClient } = require('./src/config/database');

// Split SQL into statements, handling multiline statements correctly
function splitSQLStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inDollarQuoting = false;
  let dollarTag = '';

  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip comments and empty lines
    if (trimmedLine.startsWith('--') || trimmedLine === '') {
      continue;
    }

    // Check for dollar quoting (for functions)
    const dollarQuoteRegex = /\$([^$]*)\$/g;
    let match;
    while ((match = dollarQuoteRegex.exec(line)) !== null) {
      if (!inDollarQuoting) {
        inDollarQuoting = true;
        dollarTag = match[1];
      } else if (match[1] === dollarTag) {
        inDollarQuoting = false;
        dollarTag = '';
      }
    }

    currentStatement += line + '\n';

    // If we're not in dollar quoting and line ends with semicolon, it's a statement end
    if (!inDollarQuoting && trimmedLine.endsWith(';')) {
      const statement = currentStatement.trim();
      if (statement) {
        statements.push(statement);
      }
      currentStatement = '';
    }
  }

  // Add any remaining statement
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  return statements;
}

async function runMigration() {
  console.log('🔄 Starting database migration...');

  const client = await getClient();

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'src/migrations/posting_system_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');

    // Split into individual statements
    const statements = splitSQLStatements(migrationSQL);
    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    console.log('⚡ Executing migration statements...');
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await client.query(statement);
        console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully`);
      } catch (error) {
        // Some statements might fail if objects already exist - that's okay
        if (error.code === '42P07' || error.code === '42P16' || error.code === '42710') {
          console.log(`⚠ Statement ${i + 1}/${statements.length} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1}/${statements.length} failed:`, error.message);
          console.log('Statement:', statement.substring(0, 200) + '...');
          throw error;
        }
      }
    }

    console.log('✅ Database migration completed successfully!');
    console.log('🎯 The following schema has been created/updated:');
    console.log('   - posts table with post_type column');
    console.log('   - post_media table for file attachments');
    console.log('   - post_reactions, post_comments, user_follows tables');
    console.log('   - All necessary indexes and triggers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('🔍 Error details:', error);
    process.exit(1);
  } finally {
    // Close database connection
    client.release();
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
runMigration();