/**
 * Test: Rollback 005 - Interface Management
 * Tests the rollback of interface management fields from projects table
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
        
        // Simulate column removal
        if (sql.includes('DROP COLUMN')) {
            const tableName = this.extractTableName(sql);
            const columnName = this.extractColumnName(sql);
            if (this.tables[tableName]) {
                delete this.tables[tableName][columnName];
            }
        }
        
        // Simulate index removal
        if (sql.includes('DROP INDEX')) {
            const indexName = this.extractIndexName(sql);
            delete this.indexes[indexName];
        }
        
        // Simulate constraint removal
        if (sql.includes('DROP CONSTRAINT')) {
            const constraintName = this.extractConstraintName(sql);
            delete this.constraints[constraintName];
        }
        
        return { rows: [], rowCount: 0 };
    }

    extractTableName(sql) {
        const match = sql.match(/ALTER TABLE (\w+)/i);
        return match ? match[1] : null;
    }

    extractIndexName(sql) {
        const match = sql.match(/DROP INDEX (?:IF EXISTS )?(\w+)/i);
        return match ? match[1] : null;
    }

    extractConstraintName(sql) {
        const match = sql.match(/DROP CONSTRAINT (?:IF EXISTS )?(\w+)/i);
        return match ? match[1] : null;
    }

    extractColumnName(sql) {
        const match = sql.match(/DROP COLUMN (?:IF EXISTS )?(\w+)/i);
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

describe('Rollback 005 - Interface Management', () => {
    let db;
    let rollbackContent;

    beforeAll(() => {
        // Load rollback content
        const rollbackPath = path.join(__dirname, '../../../../../database/migrations/rollback/005_rollback_interface_management.sql');
        rollbackContent = fs.readFileSync(rollbackPath, 'utf8');
    });

    beforeEach(() => {
        db = new MockDatabase();
        
        // Setup projects table with interface management fields
        db.tables.projects = {
            id: { type: 'TEXT', nullable: false },
            name: { type: 'TEXT', nullable: false },
            description: { type: 'TEXT', nullable: true },
            workspace_path: { type: 'TEXT', nullable: false },
            interface_count: { type: 'INTEGER', nullable: true },
            active_interface_id: { type: 'TEXT', nullable: true },
            interface_config: { type: 'TEXT', nullable: true },
            interface_status: { type: 'TEXT', nullable: true },
            last_interface_switch: { type: 'TEXT', nullable: true }
        };
        
        // Setup indexes
        db.indexes.idx_projects_active_interface = {
            table: 'projects',
            columns: ['active_interface_id']
        };
        
        db.indexes.idx_projects_interface_status = {
            table: 'projects',
            columns: ['interface_status']
        };
        
        // Setup constraints
        db.constraints.chk_interface_status = {
            type: 'CHECK',
            condition: 'interface_status IN (\'none\', \'single\', \'multiple\')'
        };
    });

    test('should remove interface management columns from projects table', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify columns were removed
        expect(db.hasColumn('projects', 'interface_count')).toBe(false);
        expect(db.hasColumn('projects', 'active_interface_id')).toBe(false);
        expect(db.hasColumn('projects', 'interface_config')).toBe(false);
        expect(db.hasColumn('projects', 'interface_status')).toBe(false);
        expect(db.hasColumn('projects', 'last_interface_switch')).toBe(false);
    });

    test('should remove performance indexes', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify indexes were removed
        expect(db.hasIndex('idx_projects_active_interface')).toBe(false);
        expect(db.hasIndex('idx_projects_interface_status')).toBe(false);
    });

    test('should remove check constraints', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify constraints were removed
        expect(db.hasConstraint('chk_interface_status')).toBe(false);
    });

    test('should have proper rollback structure', () => {
        // Check for required rollback elements
        expect(rollbackContent).toContain('-- Rollback: 005_rollback_interface_management.sql');
        expect(rollbackContent).toContain('-- Description: Rollback interface management fields from projects table');
        expect(rollbackContent).toContain('-- Created: 2025-10-11T01:00:55.000Z');
        expect(rollbackContent).toContain('BEGIN;');
        expect(rollbackContent).toContain('COMMIT;');
    });

    test('should use safe SQL operations', () => {
        // Check for IF EXISTS clauses
        expect(rollbackContent).toContain('DROP INDEX IF EXISTS');
        expect(rollbackContent).toContain('DROP CONSTRAINT IF EXISTS');
        expect(rollbackContent).toContain('DROP COLUMN IF EXISTS');
    });

    test('should handle PostgreSQL and SQLite syntax', () => {
        // Check for PostgreSQL-specific syntax
        expect(rollbackContent).toContain('-- PostgreSQL Version');
        
        // Check for SQLite version comments
        expect(rollbackContent).toContain('-- SQLite Version (commented out for PostgreSQL)');
    });

    test('should execute without errors', async () => {
        // Execute rollback and verify no errors
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });

    test('should be idempotent', async () => {
        // Execute rollback multiple times
        await db.query(rollbackContent);
        await db.query(rollbackContent);
        await db.query(rollbackContent);

        // Verify columns are still removed
        expect(db.hasColumn('projects', 'interface_count')).toBe(false);
        expect(db.hasColumn('projects', 'active_interface_id')).toBe(false);
        expect(db.hasColumn('projects', 'interface_config')).toBe(false);
        expect(db.hasColumn('projects', 'interface_status')).toBe(false);
        expect(db.hasColumn('projects', 'last_interface_switch')).toBe(false);
    });

    test('should log rollback completion', () => {
        // Check for completion markers
        expect(rollbackContent).toContain('-- Rollback completed');
        expect(rollbackContent).toContain('-- Status: Applied');
        expect(rollbackContent).toContain('-- Applied: 2025-10-11T01:00:55.000Z');
    });

    test('should preserve core table structure', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify core columns are preserved
        expect(db.hasColumn('projects', 'id')).toBe(true);
        expect(db.hasColumn('projects', 'name')).toBe(true);
        expect(db.hasColumn('projects', 'description')).toBe(true);
        expect(db.hasColumn('projects', 'workspace_path')).toBe(true);
    });

    test('should handle missing columns gracefully', async () => {
        // Remove some columns before rollback
        delete db.tables.projects.interface_count;
        delete db.tables.projects.active_interface_id;

        // Execute rollback
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });

    test('should handle missing indexes gracefully', async () => {
        // Remove some indexes before rollback
        delete db.indexes.idx_projects_active_interface;

        // Execute rollback
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });

    test('should handle missing constraints gracefully', async () => {
        // Remove constraint before rollback
        delete db.constraints.chk_interface_status;

        // Execute rollback
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });
});
