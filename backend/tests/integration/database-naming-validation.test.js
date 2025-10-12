/**
 * Database Naming Validation Integration Tests
 * 
 * Tests database naming consistency and validation across all database objects.
 * Validates that all tables, columns, indexes, and constraints follow naming standards.
 */

const DatabaseConnection = require('@infrastructure/database/DatabaseConnection');
const Logger = require('@logging/Logger');

describe('Database Naming Validation Integration Tests', () => {
  let databaseConnection;
  let logger;

  beforeAll(async () => {
    logger = new Logger('DatabaseNamingValidationTest');
    
    // Initialize database connection
    const config = {
      type: process.env.DB_TYPE || 'sqlite',
      database: process.env.DB_NAME || 'pidea-test.db',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      username: process.env.DB_USER || 'test',
      password: process.env.DB_PASSWORD || 'test'
    };
    
    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();
  });

  afterAll(async () => {
    if (databaseConnection) {
      await databaseConnection.disconnect();
    }
  });

  describe('Table Naming Validation', () => {
    test('should have all tables using snake_case plural nouns', async () => {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const result = await databaseConnection.query(query);
      const tableNames = result.rows.map(row => row.table_name);
      
      // Expected tables following naming standards
      const expectedTables = [
        'analysis',
        'projects',
        'tasks',
        'users',
        'user_sessions'
      ];
      
      // Check that all tables follow snake_case pattern
      tableNames.forEach(tableName => {
        expect(tableName).toMatch(/^[a-z][a-z0-9_]*[a-z0-9]$/);
        expect(tableName).not.toMatch(/[A-Z]/);
        expect(tableName).not.toMatch(/^[0-9]/);
      });
      
      // Check that expected tables exist
      expectedTables.forEach(expectedTable => {
        expect(tableNames).toContain(expectedTable);
      });
      
      logger.info(`Validated ${tableNames.length} tables for naming consistency`);
    });

    test('should have all tables using plural nouns', async () => {
      const query = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const result = await databaseConnection.query(query);
      const tableNames = result.rows.map(row => row.table_name);
      
      // Check that tables are plural (simple heuristic)
      tableNames.forEach(tableName => {
        // Skip tables that are already plural or have special naming
        if (tableName === 'users' || tableName === 'user_sessions') {
          return;
        }
        
        // Most tables should end with 's' or have compound names
        expect(tableName).toMatch(/(s$|_)/);
      });
      
      logger.info(`Validated ${tableNames.length} tables for plural naming`);
    });
  });

  describe('Column Naming Validation', () => {
    test('should have all columns using snake_case', async () => {
      const query = `
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, column_name
      `;
      
      const result = await databaseConnection.query(query);
      const columns = result.rows;
      
      // Check that all columns follow snake_case pattern
      columns.forEach(column => {
        const columnName = column.column_name;
        expect(columnName).toMatch(/^[a-z][a-z0-9_]*[a-z0-9]$/);
        expect(columnName).not.toMatch(/[A-Z]/);
        expect(columnName).not.toMatch(/^[0-9]/);
      });
      
      logger.info(`Validated ${columns.length} columns for naming consistency`);
    });

    test('should have consistent timestamp column naming', async () => {
      const query = `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at', 'deleted_at', 'timestamp', 'event_timestamp')
        ORDER BY table_name, column_name
      `;
      
      const result = await databaseConnection.query(query);
      const timestampColumns = result.rows;
      
      // Check that timestamp columns use consistent naming
      timestampColumns.forEach(column => {
        const columnName = column.column_name;
        expect(columnName).toMatch(/^(created_at|updated_at|deleted_at|event_timestamp)$/);
      });
      
      logger.info(`Validated ${timestampColumns.length} timestamp columns for naming consistency`);
    });

    test('should have consistent ID column naming', async () => {
      const query = `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND column_name LIKE '%_id'
        ORDER BY table_name, column_name
      `;
      
      const result = await databaseConnection.query(query);
      const idColumns = result.rows;
      
      // Check that ID columns follow {table_name}_id pattern
      idColumns.forEach(column => {
        const columnName = column.column_name;
        expect(columnName).toMatch(/^[a-z][a-z0-9_]*_id$/);
      });
      
      logger.info(`Validated ${idColumns.length} ID columns for naming consistency`);
    });
  });

  describe('Index Naming Validation', () => {
    test('should have all indexes using idx_ prefix', async () => {
      const query = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY indexname
      `;
      
      const result = await databaseConnection.query(query);
      const indexNames = result.rows.map(row => row.indexname);
      
      // Check that all indexes start with idx_
      indexNames.forEach(indexName => {
        expect(indexName).toMatch(/^idx_/);
      });
      
      logger.info(`Validated ${indexNames.length} indexes for naming consistency`);
    });

    test('should have indexes following idx_{table}_{column} pattern', async () => {
      const query = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
        ORDER BY indexname
      `;
      
      const result = await databaseConnection.query(query);
      const indexNames = result.rows.map(row => row.indexname);
      
      // Check that indexes follow the pattern
      indexNames.forEach(indexName => {
        expect(indexName).toMatch(/^idx_[a-z][a-z0-9_]*_[a-z][a-z0-9_]*$/);
      });
      
      logger.info(`Validated ${indexNames.length} indexes for pattern consistency`);
    });
  });

  describe('Constraint Naming Validation', () => {
    test('should have constraints using proper prefixes', async () => {
      const query = `
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public'
        ORDER BY constraint_name
      `;
      
      const result = await databaseConnection.query(query);
      const constraints = result.rows;
      
      // Check that constraints use proper prefixes
      constraints.forEach(constraint => {
        const constraintName = constraint.constraint_name;
        const constraintType = constraint.constraint_type;
        
        switch (constraintType) {
          case 'PRIMARY KEY':
            expect(constraintName).toMatch(/^pk_/);
            break;
          case 'FOREIGN KEY':
            expect(constraintName).toMatch(/^fk_/);
            break;
          case 'UNIQUE':
            expect(constraintName).toMatch(/^uk_/);
            break;
          case 'CHECK':
            expect(constraintName).toMatch(/^chk_/);
            break;
        }
      });
      
      logger.info(`Validated ${constraints.length} constraints for naming consistency`);
    });
  });

  describe('Data Type Consistency', () => {
    test('should have consistent timestamp data types', async () => {
      const query = `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND column_name IN ('created_at', 'updated_at', 'deleted_at')
        ORDER BY table_name, column_name
      `;
      
      const result = await databaseConnection.query(query);
      const timestampColumns = result.rows;
      
      // Check that timestamp columns use consistent data types
      timestampColumns.forEach(column => {
        const dataType = column.data_type;
        expect(dataType).toMatch(/^(timestamp|text)$/);
      });
      
      logger.info(`Validated ${timestampColumns.length} timestamp columns for data type consistency`);
    });

    test('should have consistent ID data types', async () => {
      const query = `
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND column_name = 'id'
        ORDER BY table_name
      `;
      
      const result = await databaseConnection.query(query);
      const idColumns = result.rows;
      
      // Check that ID columns use consistent data types
      idColumns.forEach(column => {
        const dataType = column.data_type;
        expect(dataType).toMatch(/^(text|uuid)$/);
      });
      
      logger.info(`Validated ${idColumns.length} ID columns for data type consistency`);
    });
  });

  describe('Migration Validation', () => {
    test('should have migration 007 applied successfully', async () => {
      // Check if migration 007 was applied
      const query = `
        SELECT * FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      `;
      
      const result = await databaseConnection.query(query);
      
      if (result.rows.length > 0) {
        // Check migration status
        const migrationQuery = `
          SELECT version FROM schema_migrations 
          WHERE version = '007'
        `;
        
        const migrationResult = await databaseConnection.query(migrationQuery);
        expect(migrationResult.rows.length).toBeGreaterThan(0);
      }
      
      logger.info('Validated migration 007 application');
    });
  });

  describe('Performance Validation', () => {
    test('should maintain query performance after naming changes', async () => {
      const startTime = Date.now();
      
      // Perform a complex query
      const query = `
        SELECT u.id, u.email, COUNT(t.id) as task_count
        FROM users u
        LEFT JOIN tasks t ON u.id = t.created_by
        GROUP BY u.id, u.email
        ORDER BY task_count DESC
        LIMIT 10
      `;
      
      const result = await databaseConnection.query(query);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Query should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000);
      
      logger.info(`Query executed in ${executionTime}ms`);
    });
  });
});
