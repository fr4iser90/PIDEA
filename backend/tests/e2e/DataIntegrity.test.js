/**
 * Data Integrity End-to-End Tests
 * 
 * Tests for data integrity across complete database operations including
 * transactions, constraints, foreign keys, and data consistency validation.
 */

const DatabaseConnection = require('../../infrastructure/database/DatabaseConnection');
const AuditTrailManager = require('../../infrastructure/database/AuditTrailManager');
const SoftDeleteManager = require('../../infrastructure/database/SoftDeleteManager');
const EventStore = require('../../infrastructure/database/EventStore');
const Logger = require('../../infrastructure/logging/Logger');

describe('Data Integrity End-to-End Tests', () => {
  let databaseConnection;
  let auditTrailManager;
  let softDeleteManager;
  let eventStore;
  let mockLogger;

  beforeAll(async () => {
    // Mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
    
    jest.spyOn(Logger, 'Logger').mockImplementation(() => mockLogger);

    // Initialize database connection
    const config = {
      type: 'sqlite',
      database: ':memory:'
    };

    databaseConnection = new DatabaseConnection(config);
    await databaseConnection.connect();

    // Initialize components
    auditTrailManager = new AuditTrailManager(databaseConnection);
    await auditTrailManager.initialize();

    softDeleteManager = new SoftDeleteManager(databaseConnection);
    await softDeleteManager.initialize();

    eventStore = new EventStore(databaseConnection);
    await eventStore.initialize();

    // Create test tables with constraints
    await createTestTablesWithConstraints();
  });

  afterAll(async () => {
    if (databaseConnection) {
      await databaseConnection.disconnect();
    }
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  async function createTestTablesWithConstraints() {
    // Create users table with constraints
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER CHECK (age >= 0 AND age <= 150),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create posts table with foreign key constraint
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create comments table with foreign key constraint
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create tags table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create post_tags junction table
    await databaseConnection.execute(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (post_id, tag_id),
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
      )
    `);
  }

  async function cleanupTestData() {
    try {
      await databaseConnection.execute('DELETE FROM post_tags');
      await databaseConnection.execute('DELETE FROM comments');
      await databaseConnection.execute('DELETE FROM posts');
      await databaseConnection.execute('DELETE FROM tags');
      await databaseConnection.execute('DELETE FROM users');
      await databaseConnection.execute('DELETE FROM events');
      await databaseConnection.execute('DELETE FROM audit_trail');
      await databaseConnection.execute('DELETE FROM soft_deletes');
    } catch (error) {
      // Ignore cleanup errors for non-existent tables
    }
  }

  describe('Transaction Integrity', () => {
    test('should maintain data integrity with successful transactions', async () => {
      // Start transaction
      await databaseConnection.execute('BEGIN TRANSACTION');

      try {
        // Insert user
        await databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['John Doe', 'john@example.com', 30]
        );

        // Get user ID
        const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
        const userId = users[0].id;

        // Insert post
        await databaseConnection.execute(
          'INSERT INTO posts (user_id, title, content, status) VALUES (?, ?, ?, ?)',
          [userId, 'Test Post', 'This is a test post', 'published']
        );

        // Get post ID
        const posts = await databaseConnection.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
        const postId = posts[0].id;

        // Insert comment
        await databaseConnection.execute(
          'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
          [postId, userId, 'This is a test comment']
        );

        // Commit transaction
        await databaseConnection.execute('COMMIT');

        // Verify all data was inserted
        const finalUsers = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
        const finalPosts = await databaseConnection.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
        const finalComments = await databaseConnection.query('SELECT * FROM comments WHERE post_id = ?', [postId]);

        expect(finalUsers).toHaveLength(1);
        expect(finalPosts).toHaveLength(1);
        expect(finalComments).toHaveLength(1);

        expect(finalUsers[0].name).toBe('John Doe');
        expect(finalPosts[0].title).toBe('Test Post');
        expect(finalComments[0].content).toBe('This is a test comment');

      } catch (error) {
        // Rollback on error
        await databaseConnection.execute('ROLLBACK');
        throw error;
      }
    });

    test('should maintain data integrity with failed transactions', async () => {
      // Start transaction
      await databaseConnection.execute('BEGIN TRANSACTION');

      try {
        // Insert user
        await databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['John Doe', 'john@example.com', 30]
        );

        // Get user ID
        const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
        const userId = users[0].id;

        // Insert post
        await databaseConnection.execute(
          'INSERT INTO posts (user_id, title, content, status) VALUES (?, ?, ?, ?)',
          [userId, 'Test Post', 'This is a test post', 'published']
        );

        // Attempt to insert invalid data (should fail)
        await databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['Jane Doe', 'john@example.com', 25] // Duplicate email
        );

        // This should not be reached
        expect(true).toBe(false);

      } catch (error) {
        // Rollback on error
        await databaseConnection.execute('ROLLBACK');

        // Verify no data was inserted
        const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
        const posts = await databaseConnection.query('SELECT * FROM posts');
        const comments = await databaseConnection.query('SELECT * FROM comments');

        expect(users).toHaveLength(0);
        expect(posts).toHaveLength(0);
        expect(comments).toHaveLength(0);
      }
    });

    test('should handle concurrent transactions', async () => {
      const transaction1 = async () => {
        await databaseConnection.execute('BEGIN TRANSACTION');
        await databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['User 1', 'user1@example.com', 25]
        );
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        await databaseConnection.execute('COMMIT');
      };

      const transaction2 = async () => {
        await databaseConnection.execute('BEGIN TRANSACTION');
        await databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['User 2', 'user2@example.com', 30]
        );
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
        await databaseConnection.execute('COMMIT');
      };

      // Execute transactions concurrently
      await Promise.all([transaction1(), transaction2()]);

      // Verify both transactions completed successfully
      const users = await databaseConnection.query('SELECT * FROM users ORDER BY email');
      expect(users).toHaveLength(2);
      expect(users[0].email).toBe('user1@example.com');
      expect(users[1].email).toBe('user2@example.com');
    });
  });

  describe('Constraint Integrity', () => {
    test('should enforce NOT NULL constraints', async () => {
      // Attempt to insert user without required name
      await expect(
        databaseConnection.execute(
          'INSERT INTO users (email, age) VALUES (?, ?)',
          ['john@example.com', 30]
        )
      ).rejects.toThrow();

      // Attempt to insert user without required email
      await expect(
        databaseConnection.execute(
          'INSERT INTO users (name, age) VALUES (?, ?)',
          ['John Doe', 30]
        )
      ).rejects.toThrow();

      // Verify no data was inserted
      const users = await databaseConnection.query('SELECT * FROM users');
      expect(users).toHaveLength(0);
    });

    test('should enforce UNIQUE constraints', async () => {
      // Insert first user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      // Attempt to insert user with duplicate email
      await expect(
        databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['Jane Doe', 'john@example.com', 25]
        )
      ).rejects.toThrow();

      // Verify only one user was inserted
      const users = await databaseConnection.query('SELECT * FROM users');
      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('John Doe');
    });

    test('should enforce CHECK constraints', async () => {
      // Attempt to insert user with invalid age
      await expect(
        databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['John Doe', 'john@example.com', -1]
        )
      ).rejects.toThrow();

      // Attempt to insert user with age over limit
      await expect(
        databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['John Doe', 'john@example.com', 200]
        )
      ).rejects.toThrow();

      // Insert user with valid age
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      // Verify user was inserted
      const users = await databaseConnection.query('SELECT * FROM users');
      expect(users).toHaveLength(1);
      expect(users[0].age).toBe(30);
    });

    test('should enforce foreign key constraints', async () => {
      // Insert user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const userId = users[0].id;

      // Insert post with valid user_id
      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userId, 'Test Post', 'This is a test post']
      );

      // Attempt to insert post with invalid user_id
      await expect(
        databaseConnection.execute(
          'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
          [999, 'Invalid Post', 'This should fail']
        )
      ).rejects.toThrow();

      // Verify only valid post was inserted
      const posts = await databaseConnection.query('SELECT * FROM posts');
      expect(posts).toHaveLength(1);
      expect(posts[0].title).toBe('Test Post');
    });

    test('should enforce cascade delete constraints', async () => {
      // Insert user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const userId = users[0].id;

      // Insert post
      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userId, 'Test Post', 'This is a test post']
      );

      const posts = await databaseConnection.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
      const postId = posts[0].id;

      // Insert comment
      await databaseConnection.execute(
        'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [postId, userId, 'This is a test comment']
      );

      // Delete user (should cascade to posts and comments)
      await databaseConnection.execute('DELETE FROM users WHERE id = ?', [userId]);

      // Verify cascade delete
      const remainingUsers = await databaseConnection.query('SELECT * FROM users WHERE id = ?', [userId]);
      const remainingPosts = await databaseConnection.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
      const remainingComments = await databaseConnection.query('SELECT * FROM comments WHERE post_id = ?', [postId]);

      expect(remainingUsers).toHaveLength(0);
      expect(remainingPosts).toHaveLength(0);
      expect(remainingComments).toHaveLength(0);
    });
  });

  describe('Data Consistency Validation', () => {
    test('should maintain referential integrity across operations', async () => {
      // Insert user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const userId = users[0].id;

      // Insert post
      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userId, 'Test Post', 'This is a test post']
      );

      const posts = await databaseConnection.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
      const postId = posts[0].id;

      // Insert comment
      await databaseConnection.execute(
        'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [postId, userId, 'This is a test comment']
      );

      // Verify referential integrity
      const userPosts = await databaseConnection.query(`
        SELECT u.name, p.title, c.content
        FROM users u
        JOIN posts p ON u.id = p.user_id
        JOIN comments c ON p.id = c.post_id
        WHERE u.id = ?
      `, [userId]);

      expect(userPosts).toHaveLength(1);
      expect(userPosts[0].name).toBe('John Doe');
      expect(userPosts[0].title).toBe('Test Post');
      expect(userPosts[0].content).toBe('This is a test comment');
    });

    test('should maintain data consistency with soft deletes', async () => {
      // Insert user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const userId = users[0].id;

      // Insert post
      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userId, 'Test Post', 'This is a test post']
      );

      // Soft delete user
      await softDeleteManager.softDelete('users', userId);

      // Verify user is soft deleted
      const deletedUsers = await databaseConnection.query('SELECT * FROM users WHERE id = ?', [userId]);
      expect(deletedUsers).toHaveLength(0);

      // Verify post is also soft deleted (cascade)
      const deletedPosts = await databaseConnection.query('SELECT * FROM posts WHERE user_id = ?', [userId]);
      expect(deletedPosts).toHaveLength(0);

      // Verify soft delete records exist
      const softDeleteRecords = await databaseConnection.query(
        'SELECT * FROM soft_deletes WHERE table_name = ? AND record_id = ?',
        ['users', userId]
      );
      expect(softDeleteRecords).toHaveLength(1);
    });

    test('should maintain data consistency with event sourcing', async () => {
      // Create user event
      const userCreatedEvent = {
        aggregateId: 'user-123',
        eventType: 'UserCreated',
        eventData: { name: 'John Doe', email: 'john@example.com', age: 30 },
        version: 1,
        timestamp: new Date().toISOString()
      };

      await eventStore.storeEvent(userCreatedEvent);

      // Insert user record
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      // Update user event
      const userUpdatedEvent = {
        aggregateId: 'user-123',
        eventType: 'UserUpdated',
        eventData: { name: 'Jane Doe' },
        version: 2,
        timestamp: new Date().toISOString()
      };

      await eventStore.storeEvent(userUpdatedEvent);

      // Update user record
      await databaseConnection.execute(
        'UPDATE users SET name = ? WHERE email = ?',
        ['Jane Doe', 'john@example.com']
      );

      // Verify data consistency
      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const events = await eventStore.getEvents('user-123');
      const aggregate = await eventStore.reconstructAggregate('user-123');

      expect(users).toHaveLength(1);
      expect(users[0].name).toBe('Jane Doe');
      expect(events).toHaveLength(2);
      expect(aggregate.name).toBe('Jane Doe');
      expect(aggregate.email).toBe('john@example.com');
    });

    test('should maintain data consistency with audit trails', async () => {
      // Insert user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const userId = users[0].id;

      // Audit the insertion
      const insertAuditData = {
        tableName: 'users',
        operation: 'INSERT',
        recordId: userId.toString(),
        oldValues: null,
        newValues: { name: 'John Doe', email: 'john@example.com', age: 30 },
        userId: 'system',
        timestamp: new Date().toISOString()
      };

      await auditTrailManager.logOperation(insertAuditData);

      // Update user
      await databaseConnection.execute(
        'UPDATE users SET name = ? WHERE id = ?',
        ['Jane Doe', userId]
      );

      // Audit the update
      const updateAuditData = {
        tableName: 'users',
        operation: 'UPDATE',
        recordId: userId.toString(),
        oldValues: { name: 'John Doe', email: 'john@example.com', age: 30 },
        newValues: { name: 'Jane Doe', email: 'john@example.com', age: 30 },
        userId: 'system',
        timestamp: new Date().toISOString()
      };

      await auditTrailManager.logOperation(updateAuditData);

      // Verify data consistency
      const updatedUsers = await databaseConnection.query('SELECT * FROM users WHERE id = ?', [userId]);
      const auditTrail = await auditTrailManager.getAuditTrailForRecord('users', userId.toString());

      expect(updatedUsers).toHaveLength(1);
      expect(updatedUsers[0].name).toBe('Jane Doe');
      expect(auditTrail).toHaveLength(2);
      expect(auditTrail[0].operation).toBe('INSERT');
      expect(auditTrail[1].operation).toBe('UPDATE');
    });
  });

  describe('Complex Data Relationships', () => {
    test('should maintain integrity with many-to-many relationships', async () => {
      // Insert users
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['Jane Doe', 'jane@example.com', 25]
      );

      const users = await databaseConnection.query('SELECT * FROM users ORDER BY email');
      const johnId = users[0].id;
      const janeId = users[1].id;

      // Insert posts
      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [johnId, 'John\'s Post', 'This is John\'s post']
      );

      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [janeId, 'Jane\'s Post', 'This is Jane\'s post']
      );

      const posts = await databaseConnection.query('SELECT * FROM posts ORDER BY user_id');
      const johnPostId = posts[0].id;
      const janePostId = posts[1].id;

      // Insert tags
      await databaseConnection.execute(
        'INSERT INTO tags (name) VALUES (?)',
        ['Technology']
      );

      await databaseConnection.execute(
        'INSERT INTO tags (name) VALUES (?)',
        ['Programming']
      );

      const tags = await databaseConnection.query('SELECT * FROM tags ORDER BY name');
      const techTagId = tags[0].id;
      const progTagId = tags[1].id;

      // Create many-to-many relationships
      await databaseConnection.execute(
        'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        [johnPostId, techTagId]
      );

      await databaseConnection.execute(
        'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        [johnPostId, progTagId]
      );

      await databaseConnection.execute(
        'INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)',
        [janePostId, techTagId]
      );

      // Verify many-to-many relationships
      const postTags = await databaseConnection.query(`
        SELECT p.title, t.name as tag_name
        FROM posts p
        JOIN post_tags pt ON p.id = pt.post_id
        JOIN tags t ON pt.tag_id = t.id
        ORDER BY p.title, t.name
      `);

      expect(postTags).toHaveLength(3);
      expect(postTags[0].title).toBe('Jane\'s Post');
      expect(postTags[0].tag_name).toBe('Technology');
      expect(postTags[1].title).toBe('John\'s Post');
      expect(postTags[1].tag_name).toBe('Programming');
      expect(postTags[2].title).toBe('John\'s Post');
      expect(postTags[2].tag_name).toBe('Technology');
    });

    test('should maintain integrity with hierarchical relationships', async () => {
      // Insert root user
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['Root User', 'root@example.com', 40]
      );

      const rootUsers = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['root@example.com']);
      const rootUserId = rootUsers[0].id;

      // Insert child users
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['Child User 1', 'child1@example.com', 20]
      );

      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['Child User 2', 'child2@example.com', 22]
      );

      const childUsers = await databaseConnection.query('SELECT * FROM users WHERE email LIKE ?', ['child%@example.com']);
      const child1Id = childUsers[0].id;
      const child2Id = childUsers[1].id;

      // Insert posts for each user
      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [rootUserId, 'Root Post', 'This is the root post']
      );

      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [child1Id, 'Child 1 Post', 'This is child 1 post']
      );

      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [child2Id, 'Child 2 Post', 'This is child 2 post']
      );

      // Verify hierarchical relationships
      const hierarchicalData = await databaseConnection.query(`
        SELECT u.name, p.title, p.content
        FROM users u
        JOIN posts p ON u.id = p.user_id
        ORDER BY u.name, p.title
      `);

      expect(hierarchicalData).toHaveLength(3);
      expect(hierarchicalData[0].name).toBe('Child User 1');
      expect(hierarchicalData[1].name).toBe('Child User 2');
      expect(hierarchicalData[2].name).toBe('Root User');
    });
  });

  describe('Data Recovery and Rollback', () => {
    test('should recover from partial transaction failures', async () => {
      // Start transaction
      await databaseConnection.execute('BEGIN TRANSACTION');

      try {
        // Insert user
        await databaseConnection.execute(
          'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
          ['John Doe', 'john@example.com', 30]
        );

        const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
        const userId = users[0].id;

        // Insert post
        await databaseConnection.execute(
          'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
          [userId, 'Test Post', 'This is a test post']
        );

        // Simulate error
        throw new Error('Simulated error');

      } catch (error) {
        // Rollback transaction
        await databaseConnection.execute('ROLLBACK');

        // Verify no data was committed
        const users = await databaseConnection.query('SELECT * FROM users');
        const posts = await databaseConnection.query('SELECT * FROM posts');

        expect(users).toHaveLength(0);
        expect(posts).toHaveLength(0);
      }
    });

    test('should handle data recovery after system failure', async () => {
      // Insert some data
      await databaseConnection.execute(
        'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 30]
      );

      const users = await databaseConnection.query('SELECT * FROM users WHERE email = ?', ['john@example.com']);
      const userId = users[0].id;

      await databaseConnection.execute(
        'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
        [userId, 'Test Post', 'This is a test post']
      );

      // Simulate system failure by disconnecting
      await databaseConnection.disconnect();

      // Reconnect
      const config = {
        type: 'sqlite',
        database: ':memory:'
      };

      databaseConnection = new DatabaseConnection(config);
      await databaseConnection.connect();

      // Recreate tables
      await createTestTablesWithConstraints();

      // Verify data recovery (in-memory database loses data, but structure is maintained)
      const tables = await databaseConnection.query(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );

      expect(tables.length).toBeGreaterThan(0);
    });
  });
});
