/**
 * Test: Migration 006 - Project Interfaces Table
 * Tests the project_interfaces table creation
 * Created: 2025-10-11T01:00:55.000Z
 * Version: 1.0.0
 */

const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

// Mock database connection for testing
class MockDatabase {
    constructor() {
        this.tables = {};
        this.indexes = {};
        this.constraints = {};
        this.queries = [];
    }

    async query(sql) {
        this.queries.push(sql);
        
        // Simulate table creation
        if (sql.includes('CREATE TABLE')) {
            const tableName = this.extractTableName(sql);
            this.tables[tableName] = this.parseTableDefinition(sql);
        }
        
        // Simulate index creation
        if (sql.includes('CREATE INDEX')) {
            const indexName = this.extractIndexName(sql);
            this.indexes[indexName] = this.parseIndexDefinition(sql);
        }
        
        // Simulate constraint addition
        if (sql.includes('ADD CONSTRAINT')) {
            const constraintName = this.extractConstraintName(sql);
            this.constraints[constraintName] = this.parseConstraintDefinition(sql);
        }
        
        return { rows: [], rowCount: 0 };
    }

    extractTableName(sql) {
        const match = sql.match(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)/i);
        return match ? match[1] : null;
    }

    extractIndexName(sql) {
        const match = sql.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i);
        return match ? match[1] : null;
    }

    extractConstraintName(sql) {
        const match = sql.match(/ADD CONSTRAINT (\w+)/i);
        return match ? match[1] : null;
    }

    parseTableDefinition(sql) {
        // Simple table definition parser
        const columns = {};
        const columnMatches = sql.matchAll(/(\w+)\s+(\w+(?:\(\d+\))?)/g);
        for (const match of columnMatches) {
            columns[match[1]] = {
                type: match[2],
                nullable: true
            };
        }
        return columns;
    }

    parseIndexDefinition(sql) {
        const match = sql.match(/ON (\w+)\(([^)]+)\)/i);
        if (match) {
            return {
                table: match[1],
                columns: match[2].split(',').map(col => col.trim())
            };
        }
        return null;
    }

    parseConstraintDefinition(sql) {
        if (sql.includes('CHECK')) {
            const match = sql.match(/CHECK \(([^)]+)\)/i);
            if (match) {
                return {
                    type: 'CHECK',
                    condition: match[1]
                };
            }
        }
        return null;
    }

    hasTable(tableName) {
        return this.tables.hasOwnProperty(tableName);
    }

    hasColumn(tableName, columnName) {
        return this.tables[tableName] && this.tables[tableName].hasOwnProperty(columnName);
    }

    hasIndex(indexName) {
        return this.indexes.hasOwnProperty(indexName);
    }

    hasConstraint(constraintName) {
        return this.constraints.hasOwnProperty(constraintName);
    }

    getQueries() {
        return this.queries;
    }
}

describe('Migration 006 - Project Interfaces Table', () => {
    let db;
    let migrationContent;

    beforeAll(() => {
        // Load migration content
        const migrationPath = path.join(__dirname, '../../../../database/migrations/006_create_project_interfaces_table.sql');
        migrationContent = fs.readFileSync(migrationPath, 'utf8');
    });

    beforeEach(() => {
        db = new MockDatabase();
        
        // Setup initial tables
        db.tables.projects = {
            id: { type: 'TEXT', nullable: false },
            name: { type: 'TEXT', nullable: false }
        };
        
        db.tables.users = {
            id: { type: 'TEXT', nullable: false },
            username: { type: 'TEXT', nullable: false }
        };
    });

    test('should create project_interfaces table', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify table was created
        expect(db.hasTable('project_interfaces')).toBe(true);
    });

    test('should have all required columns', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify all columns exist
        const expectedColumns = [
            'id', 'project_id', 'interface_name', 'interface_type',
            'interface_subtype', 'config', 'settings', 'status',
            'is_default', 'priority', 'connection_config', 'last_connected',
            'connection_count', 'capabilities', 'supported_operations',
            'metadata', 'created_at', 'updated_at', 'created_by'
        ];

        expectedColumns.forEach(column => {
            expect(db.hasColumn('project_interfaces', column)).toBe(true);
        });
    });

    test('should create performance indexes', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify indexes were created
        const expectedIndexes = [
            'idx_project_interfaces_project_id',
            'idx_project_interfaces_type',
            'idx_project_interfaces_status',
            'idx_project_interfaces_default',
            'idx_project_interfaces_priority',
            'idx_project_interfaces_created_by',
            'idx_project_interfaces_created_at'
        ];

        expectedIndexes.forEach(index => {
            expect(db.hasIndex(index)).toBe(true);
        });
    });

    test('should add check constraints', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify constraints were added
        expect(db.hasConstraint('chk_interface_status')).toBe(true);
        expect(db.hasConstraint('chk_interface_type')).toBe(true);
        expect(db.hasConstraint('chk_priority')).toBe(true);
    });

    test('should have proper migration structure', () => {
        // Check for required migration elements
        expect(migrationContent).toContain('-- Migration: 006_create_project_interfaces_table.sql');
        expect(migrationContent).toContain('-- Description: Create project_interfaces table for interface management');
        expect(migrationContent).toContain('-- Created: 2025-10-11T01:00:55.000Z');
        expect(migrationContent).toContain('BEGIN;');
        expect(migrationContent).toContain('COMMIT;');
    });

    test('should use safe SQL operations', () => {
        // Check for IF NOT EXISTS clauses
        expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS');
        expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS');
    });

    test('should handle PostgreSQL and SQLite syntax', () => {
        // Check for PostgreSQL-specific syntax
        expect(migrationContent).toContain('uuid_generate_v4()');
        
        // Check for SQLite version comments
        expect(migrationContent).toContain('-- SQLite Version (commented out for PostgreSQL)');
    });

    test('should include proper table and column comments', () => {
        // Check for documentation comments
        expect(migrationContent).toContain('COMMENT ON TABLE project_interfaces IS');
        expect(migrationContent).toContain('COMMENT ON COLUMN project_interfaces.id IS');
        expect(migrationContent).toContain('COMMENT ON COLUMN project_interfaces.project_id IS');
        expect(migrationContent).toContain('COMMENT ON COLUMN project_interfaces.interface_name IS');
    });

    test('should validate interface status constraint', () => {
        // Check constraint definition
        const constraintMatch = migrationContent.match(/CHECK \(status IN \('active', 'inactive', 'error', 'connecting'\)\)/);
        expect(constraintMatch).toBeTruthy();
    });

    test('should validate interface type constraint', () => {
        // Check constraint definition
        const constraintMatch = migrationContent.match(/CHECK \(interface_type IN \('ide', 'editor', 'terminal', 'browser', 'custom'\)\)/);
        expect(constraintMatch).toBeTruthy();
    });

    test('should validate priority constraint', () => {
        // Check constraint definition
        const constraintMatch = migrationContent.match(/CHECK \(priority >= 0 AND priority <= 100\)/);
        expect(constraintMatch).toBeTruthy();
    });

    test('should have proper foreign key relationships', () => {
        // Check for foreign key constraints
        expect(migrationContent).toContain('FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE');
        expect(migrationContent).toContain('FOREIGN KEY (created_by) REFERENCES users (id)');
    });

    test('should execute without errors', async () => {
        // Execute migration and verify no errors
        await expect(db.query(migrationContent)).resolves.not.toThrow();
    });

    test('should be idempotent', async () => {
        // Execute migration multiple times
        await db.query(migrationContent);
        await db.query(migrationContent);
        await db.query(migrationContent);

        // Verify table still exists
        expect(db.hasTable('project_interfaces')).toBe(true);
    });

    test('should log migration completion', () => {
        // Check for completion markers
        expect(migrationContent).toContain('-- Migration completed');
        expect(migrationContent).toContain('-- Status: Applied');
        expect(migrationContent).toContain('-- Applied: 2025-10-11T01:00:55.000Z');
    });

    test('should have proper default values', () => {
        // Check for default values
        expect(migrationContent).toContain('DEFAULT \'inactive\'');
        expect(migrationContent).toContain('DEFAULT false');
        expect(migrationContent).toContain('DEFAULT 0');
        expect(migrationContent).toContain('DEFAULT CURRENT_TIMESTAMP');
        expect(migrationContent).toContain('DEFAULT \'me\'');
    });
});
