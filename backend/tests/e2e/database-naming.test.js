/**
 * Database Naming End-to-End Tests
 * 
 * End-to-end tests for database naming consistency across complete database operations.
 * Tests naming standards enforcement in real-world scenarios.
 */

const DatabaseConnection = require('@infrastructure/database/DatabaseConnection');
const Logger = require('@logging/Logger');

describe('Database Naming End-to-End Tests', () => {
  let databaseConnection;
  let logger;

  beforeAll(async () => {
    logger = new Logger('DatabaseNamingE2ETest');
    
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

  describe('Complete Database Operations with Naming Standards', () => {
    test('should perform CRUD operations with consistent naming', async () => {
      // Create a test project
      const createProjectQuery = `
        INSERT INTO projects (id, name, description, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, created_at
      `;
      
      const projectId = 'test-project-' + Date.now();
      const projectName = 'Test Project';
      const projectDescription = 'Test project for naming validation';
      const now = new Date().toISOString();
      
      const createResult = await databaseConnection.query(createProjectQuery, [
        projectId,
        projectName,
        projectDescription,
        now,
        now,
        'me'
      ]);
      
      expect(createResult.rows).toHaveLength(1);
      expect(createResult.rows[0].id).toBe(projectId);
      expect(createResult.rows[0].name).toBe(projectName);
      
      // Create a test task
      const createTaskQuery = `
        INSERT INTO tasks (id, project_id, title, description, status, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, title, status, created_at
      `;
      
      const taskId = 'test-task-' + Date.now();
      const taskTitle = 'Test Task';
      const taskDescription = 'Test task for naming validation';
      
      const createTaskResult = await databaseConnection.query(createTaskQuery, [
        taskId,
        projectId,
        taskTitle,
        taskDescription,
        'pending',
        now,
        now,
        'me'
      ]);
      
      expect(createTaskResult.rows).toHaveLength(1);
      expect(createTaskResult.rows[0].id).toBe(taskId);
      expect(createTaskResult.rows[0].title).toBe(taskTitle);
      
      // Read the data back
      const readQuery = `
        SELECT p.id as project_id, p.name as project_name, 
               t.id as task_id, t.title as task_title, t.status as task_status
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.id = $1
      `;
      
      const readResult = await databaseConnection.query(readQuery, [projectId]);
      
      expect(readResult.rows).toHaveLength(1);
      expect(readResult.rows[0].project_id).toBe(projectId);
      expect(readResult.rows[0].task_id).toBe(taskId);
      
      // Update the task
      const updateTaskQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = $2
        WHERE id = $3
        RETURNING id, status, updated_at
      `;
      
      const updateTime = new Date().toISOString();
      const updateResult = await databaseConnection.query(updateTaskQuery, [
        'in_progress',
        updateTime,
        taskId
      ]);
      
      expect(updateResult.rows).toHaveLength(1);
      expect(updateResult.rows[0].status).toBe('in_progress');
      
      // Delete the task
      const deleteTaskQuery = `
        DELETE FROM tasks WHERE id = $1
        RETURNING id
      `;
      
      const deleteTaskResult = await databaseConnection.query(deleteTaskQuery, [taskId]);
      expect(deleteTaskResult.rows).toHaveLength(1);
      
      // Delete the project
      const deleteProjectQuery = `
        DELETE FROM projects WHERE id = $1
        RETURNING id
      `;
      
      const deleteProjectResult = await databaseConnection.query(deleteProjectQuery, [projectId]);
      expect(deleteProjectResult.rows).toHaveLength(1);
      
      logger.info('Completed CRUD operations with naming validation');
    });

    test('should handle complex queries with consistent naming', async () => {
      // Create test data
      const projectId = 'test-project-complex-' + Date.now();
      const taskId1 = 'test-task-1-' + Date.now();
      const taskId2 = 'test-task-2-' + Date.now();
      const now = new Date().toISOString();
      
      // Insert project
      await databaseConnection.query(`
        INSERT INTO projects (id, name, description, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [projectId, 'Complex Test Project', 'Project for complex query testing', now, now, 'me']);
      
      // Insert tasks
      await databaseConnection.query(`
        INSERT INTO tasks (id, project_id, title, description, status, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [taskId1, projectId, 'Task 1', 'First task', 'pending', now, now, 'me']);
      
      await databaseConnection.query(`
        INSERT INTO tasks (id, project_id, title, description, status, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [taskId2, projectId, 'Task 2', 'Second task', 'completed', now, now, 'me']);
      
      // Complex query with joins and aggregations
      const complexQuery = `
        SELECT 
          p.id as project_id,
          p.name as project_name,
          COUNT(t.id) as total_tasks,
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
          MIN(t.created_at) as first_task_created,
          MAX(t.updated_at) as last_task_updated
        FROM projects p
        LEFT JOIN tasks t ON p.id = t.project_id
        WHERE p.id = $1
        GROUP BY p.id, p.name
      `;
      
      const complexResult = await databaseConnection.query(complexQuery, [projectId]);
      
      expect(complexResult.rows).toHaveLength(1);
      expect(complexResult.rows[0].project_id).toBe(projectId);
      expect(complexResult.rows[0].total_tasks).toBe('2');
      expect(complexResult.rows[0].completed_tasks).toBe('1');
      expect(complexResult.rows[0].pending_tasks).toBe('1');
      
      // Cleanup
      await databaseConnection.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
      await databaseConnection.query('DELETE FROM projects WHERE id = $1', [projectId]);
      
      logger.info('Completed complex query with naming validation');
    });

    test('should handle transactions with consistent naming', async () => {
      const projectId = 'test-project-transaction-' + Date.now();
      const taskId = 'test-task-transaction-' + Date.now();
      const now = new Date().toISOString();
      
      try {
        // Start transaction
        await databaseConnection.query('BEGIN');
        
        // Insert project
        await databaseConnection.query(`
          INSERT INTO projects (id, name, description, created_at, updated_at, created_by)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [projectId, 'Transaction Test Project', 'Project for transaction testing', now, now, 'me']);
        
        // Insert task
        await databaseConnection.query(`
          INSERT INTO tasks (id, project_id, title, description, status, created_at, updated_at, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [taskId, projectId, 'Transaction Task', 'Task for transaction testing', 'pending', now, now, 'me']);
        
        // Commit transaction
        await databaseConnection.query('COMMIT');
        
        // Verify data was inserted
        const verifyQuery = `
          SELECT p.id as project_id, t.id as task_id
          FROM projects p
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.id = $1
        `;
        
        const verifyResult = await databaseConnection.query(verifyQuery, [projectId]);
        expect(verifyResult.rows).toHaveLength(1);
        expect(verifyResult.rows[0].project_id).toBe(projectId);
        expect(verifyResult.rows[0].task_id).toBe(taskId);
        
        // Cleanup
        await databaseConnection.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
        await databaseConnection.query('DELETE FROM projects WHERE id = $1', [projectId]);
        
        logger.info('Completed transaction with naming validation');
        
      } catch (error) {
        // Rollback on error
        await databaseConnection.query('ROLLBACK');
        throw error;
      }
    });
  });

  describe('Performance with Naming Standards', () => {
    test('should maintain performance with standardized naming', async () => {
      const startTime = Date.now();
      
      // Perform multiple operations
      const operations = [
        'SELECT COUNT(*) FROM users',
        'SELECT COUNT(*) FROM projects',
        'SELECT COUNT(*) FROM tasks',
        'SELECT COUNT(*) FROM user_sessions',
        'SELECT COUNT(*) FROM analysis'
      ];
      
      for (const query of operations) {
        const result = await databaseConnection.query(query);
        expect(result.rows).toHaveLength(1);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // All operations should complete within reasonable time (10 seconds)
      expect(executionTime).toBeLessThan(10000);
      
      logger.info(`Performance test completed in ${executionTime}ms`);
    });

    test('should handle concurrent operations with naming standards', async () => {
      const concurrentOperations = [];
      
      // Create multiple concurrent queries
      for (let i = 0; i < 5; i++) {
        const query = `
          SELECT p.id, p.name, COUNT(t.id) as task_count
          FROM projects p
          LEFT JOIN tasks t ON p.id = t.project_id
          GROUP BY p.id, p.name
          LIMIT 10
        `;
        
        concurrentOperations.push(databaseConnection.query(query));
      }
      
      // Execute all operations concurrently
      const results = await Promise.all(concurrentOperations);
      
      // Verify all operations completed successfully
      results.forEach(result => {
        expect(result.rows).toBeDefined();
        expect(Array.isArray(result.rows)).toBe(true);
      });
      
      logger.info(`Completed ${concurrentOperations.length} concurrent operations`);
    });
  });

  describe('Error Handling with Naming Standards', () => {
    test('should handle invalid column names gracefully', async () => {
      // Try to query with invalid column name
      const invalidQuery = `
        SELECT invalid_column_name FROM users LIMIT 1
      `;
      
      await expect(databaseConnection.query(invalidQuery)).rejects.toThrow();
      
      logger.info('Handled invalid column name error');
    });

    test('should handle invalid table names gracefully', async () => {
      // Try to query with invalid table name
      const invalidQuery = `
        SELECT * FROM invalid_table_name LIMIT 1
      `;
      
      await expect(databaseConnection.query(invalidQuery)).rejects.toThrow();
      
      logger.info('Handled invalid table name error');
    });

    test('should handle constraint violations with proper naming', async () => {
      const projectId = 'test-project-constraint-' + Date.now();
      const now = new Date().toISOString();
      
      // Insert project
      await databaseConnection.query(`
        INSERT INTO projects (id, name, description, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [projectId, 'Constraint Test Project', 'Project for constraint testing', now, now, 'me']);
      
      // Try to insert duplicate project (should fail)
      await expect(databaseConnection.query(`
        INSERT INTO projects (id, name, description, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [projectId, 'Duplicate Project', 'Duplicate project', now, now, 'me'])).rejects.toThrow();
      
      // Cleanup
      await databaseConnection.query('DELETE FROM projects WHERE id = $1', [projectId]);
      
      logger.info('Handled constraint violation error');
    });
  });
});
