/**
 * Test: Rollback 006 - Project Interfaces Table
 * Tests the rollback of project_interfaces table creation
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
        
        // Simulate table removal
        if (sql.includes('DROP TABLE')) {
            const tableName = this.extractTableName(sql);
            delete this.tables[tableName];
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
        const match = sql.match(/DROP TABLE (?:IF EXISTS )?(\w+)/i);
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

describe('Rollback 006 - Project Interfaces Table', () => {
    let db;
    let rollbackContent;

    beforeAll(() => {
        // Load rollback content
        const rollbackPath = path.join(__dirname, '../../../../../database/migrations/rollback/006_rollback_project_interfaces.sql');
        rollbackContent = fs.readFileSync(rollbackPath, 'utf8');
    });

    beforeEach(() => {
        db = new MockDatabase();
        
        // Setup project_interfaces table
        db.tables.project_interfaces = {
            id: { type: 'TEXT', nullable: false },
            project_id: { type: 'TEXT', nullable: false },
            interface_name: { type: 'TEXT', nullable: false },
            interface_type: { type: 'TEXT', nullable: false },
            interface_subtype: { type: 'TEXT', nullable: true },
            config: { type: 'TEXT', nullable: true },
            settings: { type: 'TEXT', nullable: true },
            status: { type: 'TEXT', nullable: false },
            is_default: { type: 'BOOLEAN', nullable: true },
            priority: { type: 'INTEGER', nullable: true },
            connection_config: { type: 'TEXT', nullable: true },
            last_connected: { type: 'TEXT', nullable: true },
            connection_count: { type: 'INTEGER', nullable: true },
            capabilities: { type: 'TEXT', nullable: true },
            supported_operations: { type: 'TEXT', nullable: true },
            metadata: { type: 'TEXT', nullable: true },
            created_at: { type: 'TEXT', nullable: false },
            updated_at: { type: 'TEXT', nullable: false },
            created_by: { type: 'TEXT', nullable: false }
        };
        
        // Setup indexes
        db.indexes.idx_project_interfaces_project_id = {
            table: 'project_interfaces',
            columns: ['project_id']
        };
        
        db.indexes.idx_project_interfaces_type = {
            table: 'project_interfaces',
            columns: ['interface_type']
        };
        
        db.indexes.idx_project_interfaces_status = {
            table: 'project_interfaces',
            columns: ['status']
        };
        
        db.indexes.idx_project_interfaces_default = {
            table: 'project_interfaces',
            columns: ['project_id', 'is_default']
        };
        
        db.indexes.idx_project_interfaces_priority = {
            table: 'project_interfaces',
            columns: ['priority']
        };
        
        db.indexes.idx_project_interfaces_created_by = {
            table: 'project_interfaces',
            columns: ['created_by']
        };
        
        db.indexes.idx_project_interfaces_created_at = {
            table: 'project_interfaces',
            columns: ['created_at']
        };
        
        // Setup constraints
        db.constraints.chk_interface_status = {
            type: 'CHECK',
            condition: 'status IN (\'active\', \'inactive\', \'error\', \'connecting\')'
        };
        
        db.constraints.chk_interface_type = {
            type: 'CHECK',
            condition: 'interface_type IN (\'ide\', \'editor\', \'terminal\', \'browser\', \'custom\')'
        };
        
        db.constraints.chk_priority = {
            type: 'CHECK',
            condition: 'priority >= 0 AND priority <= 100'
        };
    });

    test('should remove project_interfaces table', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify table was removed
        expect(db.hasTable('project_interfaces')).toBe(false);
    });

    test('should remove all performance indexes', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify indexes were removed
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
            expect(db.hasIndex(index)).toBe(false);
        });
    });

    test('should remove all check constraints', async () => {
        // Execute rollback
        await db.query(rollbackContent);

        // Verify constraints were removed
        expect(db.hasConstraint('chk_interface_status')).toBe(false);
        expect(db.hasConstraint('chk_interface_type')).toBe(false);
        expect(db.hasConstraint('chk_priority')).toBe(false);
    });

    test('should have proper rollback structure', () => {
        // Check for required rollback elements
        expect(rollbackContent).toContain('-- Rollback: 006_rollback_project_interfaces.sql');
        expect(rollbackContent).toContain('-- Description: Rollback project_interfaces table creation');
        expect(rollbackContent).toContain('-- Created: 2025-10-11T01:00:55.000Z');
        expect(rollbackContent).toContain('BEGIN;');
        expect(rollbackContent).toContain('COMMIT;');
    });

    test('should use safe SQL operations', () => {
        // Check for IF EXISTS clauses
        expect(rollbackContent).toContain('DROP INDEX IF EXISTS');
        expect(rollbackContent).toContain('DROP CONSTRAINT IF EXISTS');
        expect(rollbackContent).toContain('DROP TABLE IF EXISTS');
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

        // Verify table is still removed
        expect(db.hasTable('project_interfaces')).toBe(false);
    });

    test('should log rollback completion', () => {
        // Check for completion markers
        expect(rollbackContent).toContain('-- Rollback completed');
        expect(rollbackContent).toContain('-- Status: Applied');
        expect(rollbackContent).toContain('-- Applied: 2025-10-11T01:00:55.000Z');
    });

    test('should handle missing table gracefully', async () => {
        // Remove table before rollback
        delete db.tables.project_interfaces;

        // Execute rollback
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });

    test('should handle missing indexes gracefully', async () => {
        // Remove some indexes before rollback
        delete db.indexes.idx_project_interfaces_project_id;
        delete db.indexes.idx_project_interfaces_type;

        // Execute rollback
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });

    test('should handle missing constraints gracefully', async () => {
        // Remove constraints before rollback
        delete db.constraints.chk_interface_status;
        delete db.constraints.chk_interface_type;

        // Execute rollback
        await expect(db.query(rollbackContent)).resolves.not.toThrow();
    });

    test('should preserve other tables', async () => {
        // Add another table
        db.tables.projects = {
            id: { type: 'TEXT', nullable: false },
            name: { type: 'TEXT', nullable: false }
        };

        // Execute rollback
        await db.query(rollbackContent);

        // Verify other tables are preserved
        expect(db.hasTable('projects')).toBe(true);
    });
});
