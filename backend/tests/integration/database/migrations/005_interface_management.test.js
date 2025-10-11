/**
 * Test: Migration 005 - Interface Management
 * Tests the interface management fields addition to projects table
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
        
        // Simulate column addition
        if (sql.includes('ADD COLUMN')) {
            const tableName = this.extractTableName(sql);
            const columnDef = this.parseColumnDefinition(sql);
            if (!this.tables[tableName]) {
                this.tables[tableName] = {};
            }
            this.tables[tableName][columnDef.name] = columnDef;
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

    parseColumnDefinition(sql) {
        const match = sql.match(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)\s+(\w+(?:\(\d+\))?)/i);
        if (match) {
            return {
                name: match[1],
                type: match[2],
                nullable: true
            };
        }
        return null;
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

describe('Migration 005 - Interface Management', () => {
    let db;
    let migrationContent;

    beforeAll(() => {
        // Load migration content
        const migrationPath = path.join(__dirname, '../../../../database/migrations/005_add_interface_management.sql');
        migrationContent = fs.readFileSync(migrationPath, 'utf8');
    });

    beforeEach(() => {
        db = new MockDatabase();
        
        // Setup initial projects table
        db.tables.projects = {
            id: { type: 'TEXT', nullable: false },
            name: { type: 'TEXT', nullable: false },
            description: { type: 'TEXT', nullable: true },
            workspace_path: { type: 'TEXT', nullable: false }
        };
    });

    test('should add interface management columns to projects table', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify columns were added
        expect(db.hasColumn('projects', 'interface_count')).toBe(true);
        expect(db.hasColumn('projects', 'active_interface_id')).toBe(true);
        expect(db.hasColumn('projects', 'interface_config')).toBe(true);
        expect(db.hasColumn('projects', 'interface_status')).toBe(true);
        expect(db.hasColumn('projects', 'last_interface_switch')).toBe(true);
    });

    test('should create performance indexes', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify indexes were created
        expect(db.hasIndex('idx_projects_active_interface')).toBe(true);
        expect(db.hasIndex('idx_projects_interface_status')).toBe(true);
    });

    test('should add check constraints', async () => {
        // Execute migration
        await db.query(migrationContent);

        // Verify constraints were added
        expect(db.hasConstraint('chk_interface_status')).toBe(true);
    });

    test('should have proper migration structure', () => {
        // Check for required migration elements
        expect(migrationContent).toContain('-- Migration: 005_add_interface_management.sql');
        expect(migrationContent).toContain('-- Description: Add interface management fields to projects table');
        expect(migrationContent).toContain('-- Created: 2025-10-11T01:00:55.000Z');
        expect(migrationContent).toContain('BEGIN;');
        expect(migrationContent).toContain('COMMIT;');
    });

    test('should use safe SQL operations', () => {
        // Check for IF NOT EXISTS clauses
        expect(migrationContent).toContain('ADD COLUMN IF NOT EXISTS');
        expect(migrationContent).toContain('CREATE INDEX IF NOT EXISTS');
        expect(migrationContent).toContain('ADD CONSTRAINT chk_interface_status');
    });

    test('should handle PostgreSQL and SQLite syntax', () => {
        // Check for PostgreSQL-specific syntax
        expect(migrationContent).toContain('uuid_generate_v4()');
        
        // Check for SQLite version comments
        expect(migrationContent).toContain('-- SQLite Version (commented out for PostgreSQL)');
    });

    test('should include proper column comments', () => {
        // Check for documentation comments
        expect(migrationContent).toContain('COMMENT ON COLUMN');
        expect(migrationContent).toContain('interface_count IS');
        expect(migrationContent).toContain('active_interface_id IS');
        expect(migrationContent).toContain('interface_config IS');
        expect(migrationContent).toContain('interface_status IS');
        expect(migrationContent).toContain('last_interface_switch IS');
    });

    test('should validate interface status constraint', () => {
        // Check constraint definition
        const constraintMatch = migrationContent.match(/CHECK \(interface_status IN \('none', 'single', 'multiple'\)\)/);
        expect(constraintMatch).toBeTruthy();
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

        // Verify columns still exist
        expect(db.hasColumn('projects', 'interface_count')).toBe(true);
        expect(db.hasColumn('projects', 'active_interface_id')).toBe(true);
        expect(db.hasColumn('projects', 'interface_config')).toBe(true);
        expect(db.hasColumn('projects', 'interface_status')).toBe(true);
        expect(db.hasColumn('projects', 'last_interface_switch')).toBe(true);
    });

    test('should log migration completion', () => {
        // Check for completion markers
        expect(migrationContent).toContain('-- Migration completed');
        expect(migrationContent).toContain('-- Status: Applied');
        expect(migrationContent).toContain('-- Applied: 2025-10-11T01:00:55.000Z');
    });
});
