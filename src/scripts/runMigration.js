const fs = require('fs');
const path = require('path');
const { query } = require('../config/database');

async function runMigration(migrationFile) {
  try {
    const migrationPath = path.join(__dirname, '../migrations', migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`Running migration: ${migrationFile}`);
    await query(sql);
    console.log(`✅ Migration completed: ${migrationFile}`);

  } catch (error) {
    console.error(`❌ Migration failed: ${migrationFile}`, error);
    throw error;
  }
}

async function main() {
  const migrationFile = process.argv[2];
  if (!migrationFile) {
    console.error('Please provide a migration file name');
    process.exit(1);
  }

  await runMigration(migrationFile);
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { runMigration };