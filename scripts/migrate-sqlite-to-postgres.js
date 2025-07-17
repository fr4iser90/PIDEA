#!/usr/bin/env node

/**
 * SQLite to PostgreSQL Migration Script
 * Migrates PIDEA data from SQLite to PostgreSQL for production deployment
 */

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class SQLiteToPostgresMigrator {
  constructor() {
    this.sqlitePath = path.join(__dirname, '../backend/database/pidea-dev.db');
    this.pgPool = null;
    this.migrationLog = [];
  }

  async initialize() {
    console.log('🚀 Initializing SQLite to PostgreSQL migration...');
    
    // Check if SQLite database exists
    if (!fs.existsSync(this.sqlitePath)) {
      throw new Error(`SQLite database not found at: ${this.sqlitePath}`);
    }

    // Initialize PostgreSQL connection
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'pidea_production',
      user: process.env.DB_USER || 'pidea_user',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test PostgreSQL connection
    const client = await this.pgPool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    console.log('✅ PostgreSQL connection established');
  }

  async migrateTable(tableName, columns, dataTransform = null) {
    console.log(`📦 Migrating table: ${tableName}`);
    
    return new Promise((resolve, reject) => {
      const sqliteDb = new sqlite3.Database(this.sqlitePath);
      
      sqliteDb.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows.length === 0) {
          console.log(`   ⚠️  No data found in ${tableName}`);
          resolve(0);
          return;
        }

        try {
          const client = await this.pgPool.connect();
          
          for (const row of rows) {
            let transformedRow = row;
            if (dataTransform) {
              transformedRow = dataTransform(row);
            }

            const columnNames = columns.map(col => col.name).join(', ');
            const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
            
            const query = `
              INSERT INTO ${tableName} (${columnNames})
              VALUES (${placeholders})
              ON CONFLICT (id) DO UPDATE SET
              ${columns.filter(col => col.name !== 'id').map((col, index) => `${col.name} = $${index + 2}`).join(', ')}
            `;

            const values = columns.map(col => transformedRow[col.name]);
            
            await client.query(query, values);
          }
          
          client.release();
          console.log(`   ✅ Migrated ${rows.length} rows from ${tableName}`);
          this.migrationLog.push(`${tableName}: ${rows.length} rows`);
          resolve(rows.length);
          
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async runMigration() {
    try {
      await this.initialize();

      console.log('\n🔄 Starting data migration...\n');

      // Define table schemas and transformations
      const migrations = [
        {
          table: 'users',
          columns: [
            { name: 'id', type: 'TEXT' },
            { name: 'email', type: 'TEXT' },
            { name: 'username', type: 'TEXT' },
            { name: 'password_hash', type: 'TEXT' },
            { name: 'role', type: 'TEXT' },
            { name: 'status', type: 'TEXT' },
            { name: 'metadata', type: 'TEXT' },
            { name: 'created_at', type: 'TEXT' },
            { name: 'updated_at', type: 'TEXT' },
            { name: 'last_login', type: 'TEXT' }
          ]
        },
        {
          table: 'user_sessions',
          columns: [
            { name: 'id', type: 'TEXT' },
            { name: 'user_id', type: 'TEXT' },
            { name: 'access_token_start', type: 'TEXT' },
            { name: 'refresh_token', type: 'TEXT' },
            { name: 'expires_at', type: 'TEXT' },
            { name: 'is_active', type: 'BOOLEAN' },
            { name: 'metadata', type: 'TEXT' },
            { name: 'created_at', type: 'TEXT' },
            { name: 'updated_at', type: 'TEXT' }
          ]
        },
        {
          table: 'projects',
          columns: [
            { name: 'id', type: 'TEXT' },
            { name: 'name', type: 'TEXT' },
            { name: 'description', type: 'TEXT' },
            { name: 'workspace_path', type: 'TEXT' },
            { name: 'type', type: 'TEXT' },
            { name: 'ide_type', type: 'TEXT' },
            { name: 'ide_port', type: 'INTEGER' },
            { name: 'ide_status', type: 'TEXT' },
            { name: 'backend_port', type: 'INTEGER' },
            { name: 'frontend_port', type: 'INTEGER' },
            { name: 'database_port', type: 'INTEGER' },
            { name: 'start_command', type: 'TEXT' },
            { name: 'build_command', type: 'TEXT' },
            { name: 'dev_command', type: 'TEXT' },
            { name: 'test_command', type: 'TEXT' },
            { name: 'framework', type: 'TEXT' },
            { name: 'language', type: 'TEXT' },
            { name: 'package_manager', type: 'TEXT' },
            { name: 'status', type: 'TEXT' },
            { name: 'priority', type: 'INTEGER' },
            { name: 'last_accessed', type: 'TEXT' },
            { name: 'access_count', type: 'INTEGER' },
            { name: 'metadata', type: 'TEXT' },
            { name: 'config', type: 'TEXT' },
            { name: 'created_at', type: 'TEXT' },
            { name: 'updated_at', type: 'TEXT' },
            { name: 'created_by', type: 'TEXT' }
          ]
        },
        {
          table: 'tasks',
          columns: [
            { name: 'id', type: 'TEXT' },
            { name: 'project_id', type: 'TEXT' },
            { name: 'title', type: 'TEXT' },
            { name: 'description', type: 'TEXT' },
            { name: 'type', type: 'TEXT' },
            { name: 'status', type: 'TEXT' },
            { name: 'priority', type: 'INTEGER' },
            { name: 'estimated_hours', type: 'REAL' },
            { name: 'actual_hours', type: 'REAL' },
            { name: 'due_date', type: 'TEXT' },
            { name: 'completed_at', type: 'TEXT' },
            { name: 'metadata', type: 'TEXT' },
            { name: 'created_at', type: 'TEXT' },
            { name: 'updated_at', type: 'TEXT' },
            { name: 'created_by', type: 'TEXT' }
          ]
        }
      ];

      let totalMigrated = 0;
      
      for (const migration of migrations) {
        try {
          const count = await this.migrateTable(migration.table, migration.columns, migration.transform);
          totalMigrated += count;
        } catch (error) {
          console.error(`❌ Error migrating ${migration.table}:`, error.message);
        }
      }

      console.log('\n📊 Migration Summary:');
      console.log('====================');
      this.migrationLog.forEach(log => console.log(`   ${log}`));
      console.log(`\n✅ Total rows migrated: ${totalMigrated}`);
      console.log('🎉 Migration completed successfully!');

    } catch (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    } finally {
      if (this.pgPool) {
        await this.pgPool.end();
      }
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new SQLiteToPostgresMigrator();
  migrator.runMigration();
}

module.exports = SQLiteToPostgresMigrator; 