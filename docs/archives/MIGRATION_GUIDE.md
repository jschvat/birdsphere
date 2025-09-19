# Database Migration Guide

This guide covers the consolidated database migration system for BirdSphere, which combines all previous migrations into a single, comprehensive migration file.

## Overview

The migration system includes:
- **Consolidated Migration**: Single SQL file with all schema changes
- **Test Database Setup**: Safe testing environment for migrations
- **Migration Runner**: Production migration execution tool
- **Automated Verification**: Post-migration validation and reporting

## Files

```
src/migrations/
├── consolidated_migration.sql     # Main migration file (USE THIS)
├── add_user_profile_fields.sql   # Legacy (consolidated)
├── update_user_schema_extended.sql # Legacy (consolidated)
└── clean_animal_categories.sql   # Legacy (consolidated)

scripts/
├── setup-test-db.js             # Test database creation
└── run-migration.js              # Production migration runner
```

## Quick Start

### 1. Test Migration (Recommended First)

Create a temporary test database and run the migration:

```bash
# Create clean test database and run migration
node scripts/setup-test-db.js --clean

# Or just create test DB (if it doesn't exist)
node scripts/setup-test-db.js
```

This creates a `birdsphere_test` database with the full schema.

### 2. Production Migration

Run the migration on your actual database:

```bash
# Run migration on default database
node scripts/run-migration.js

# Run with backup first (recommended)
node scripts/run-migration.js --backup-first

# Preview what will be executed (dry run)
node scripts/run-migration.js --dry-run
```

## Migration Contents

The consolidated migration includes:

### Schema Changes
- **User Table Extensions**:
  - Address fields (`address_street`, `address_city`, etc.)
  - Rating system (`rating`, `rating_count`)
  - User roles array (`user_roles`)

### New Tables
- **`animal_categories`**: Hierarchical animal categories (111 categories)
- **`user_animal_interests`**: Junction table for user interests
- **`user_ratings`**: User rating and review system

### Features
- **Performance Indexes**: Optimized for queries
- **Triggers**: Auto-update user ratings
- **Views**: Hierarchical category tree view
- **Functions**: Rating calculation automation

### Data Population
- **111 Animal Categories**: Birds, Dogs, Cats, Reptiles, Fish, Farm Animals
- **4-Level Hierarchy**: From general (Birds) to specific (Blue Crown Conure)
- **Icons**: Emoji icons for all categories

## Command Reference

### Test Database Setup

```bash
# Create test database and run migration
node scripts/setup-test-db.js

# Clean slate (drop existing test DB first)
node scripts/setup-test-db.js --clean

# Just drop existing test DB
node scripts/setup-test-db.js --drop-first

# Show help
node scripts/setup-test-db.js --help
```

### Migration Runner

```bash
# Run on default database
node scripts/run-migration.js

# Run on specific database
node scripts/run-migration.js --database my_db

# Create backup before migration
node scripts/run-migration.js --backup-first

# Dry run (show SQL without executing)
node scripts/run-migration.js --dry-run

# Show help
node scripts/run-migration.js --help
```

### Data Verification

```bash
# Verify test database data integrity
node scripts/verify-test-data.js

# Or use npm script
npm run db:test:verify
```

## Environment Variables

Configure your database connection:

```bash
# PostgreSQL Configuration
DB_HOST=localhost          # Database host
DB_PORT=5432              # Database port
DB_NAME=birdsphere        # Database name
DB_USER=postgres          # Database user
DB_PASSWORD=password      # Database password
```

## Safety Features

### Transaction Safety
- All migrations run in transactions
- Automatic rollback on errors
- No partial migrations

### Backup Support
- Automated backup creation (`--backup-first`)
- Timestamped backup files
- Stored in `backups/` directory

### Testing
- Separate test database
- No impact on production
- Full verification suite

## Verification

After migration, the scripts verify:

✅ **Tables Created**: All expected tables exist
✅ **Data Populated**: Animal categories loaded (111 items)
✅ **Indexes Created**: Performance indexes in place
✅ **Functions Working**: Rating calculation triggers
✅ **Views Available**: Hierarchical category view

## Sample Animal Categories

The migration populates a comprehensive animal category hierarchy:

```
Level 1: 🐦 Birds, 🐕 Dogs, 🐱 Cats, 🦎 Reptiles, 🐠 Fish, 🐄 Farm Animals

Level 2: 🦜 Parrots, 🐤 Canaries, 🦜 Budgerigars, etc.

Level 3: 🦜 Conures, 🦜 Cockatoos, 🦜 Amazons, etc.

Level 4: 🦜 American Budgerigar, 🦜 Rainbow Budgie, etc.
```

## Troubleshooting

### Connection Issues
```bash
# Test connection manually
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

### Permission Issues
```bash
# Ensure user has necessary permissions
GRANT CREATE, ALTER, INSERT ON DATABASE birdsphere TO your_user;
```

### Migration Failures
1. Check the error message in the output
2. Verify database connection settings
3. Ensure user has sufficient permissions
4. Check if tables already exist
5. Run with `--dry-run` to preview changes

### Rollback
If you need to rollback:
```bash
# Restore from backup (if created)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backups/backup-*.sql

# Or manually drop new tables
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
DROP TABLE user_ratings CASCADE;
DROP TABLE user_animal_interests CASCADE;
DROP TABLE animal_categories CASCADE;
```

## Best Practices

1. **Always Test First**: Use test database before production
2. **Create Backups**: Use `--backup-first` for production
3. **Review Changes**: Use `--dry-run` to preview
4. **Monitor Logs**: Watch for errors during migration
5. **Verify Results**: Check the verification output

## Performance Notes

- Migration completes in ~70ms on test systems
- 111 animal categories inserted
- Optimized indexes created for fast queries
- Views are materialized for better performance

## Support

If you encounter issues:

1. Check this guide first
2. Review error messages carefully
3. Test on the test database
4. Check database permissions
5. Verify environment variables

The migration system is designed to be safe, fast, and reliable. Always test before running on production!