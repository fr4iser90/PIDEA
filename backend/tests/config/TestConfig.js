/**
 * Test Configuration
 *
 * Centralized configuration for database tests including
 * database settings, test data paths, and environment options.
 */

const path = require("path");

const TEST_CONFIG = {
  databases: {
    sqlite: {
      type: "sqlite",
      database: ":memory:",
      options: {
        enableForeignKeys: true,
        enableWAL: true,
        synchronous: "NORMAL",
        journalMode: "WAL",
        cacheSize: 1000,
        tempStore: "MEMORY",
      },
    },
    postgresql: {
      type: "postgresql",
      host: "localhost",
      port: 5432,
      database: "pidea_test",
      username: "test_user",
      password: "test_password",
      options: {
        ssl: false,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        max: 10,
        min: 2,
      },
    },
  },
  testData: {
    fixtures: {
      path: path.join(__dirname, "../fixtures"),
      format: "json",
      encoding: "utf8",
    },
    generators: {
      path: path.join(__dirname, "../generators"),
      format: "js",
      encoding: "utf8",
    },
  },
  environment: {
    isolation: true,
    cleanup: true,
    monitoring: false,
    optimization: false,
    parallel: false,
    timeout: 30000,
  },
  performance: {
    monitoring: {
      enabled: false,
      threshold: 1000,
      metrics: ["execution_time", "memory_usage", "query_count"],
    },
    optimization: {
      enabled: false,
      indexes: true,
      constraints: true,
      triggers: true,
    },
  },
  security: {
    encryption: false,
    authentication: false,
    authorization: false,
    audit: false,
  },
  testTables: {
    users: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "username", type: "TEXT", notNull: true, unique: true },
        { name: "email", type: "TEXT", notNull: true, unique: true },
        { name: "password_hash", type: "TEXT", notNull: true },
        { name: "created_at", type: "TEXT", notNull: true },
        { name: "updated_at", type: "TEXT", notNull: true },
        {
          name: "is_active",
          type: "BOOLEAN",
          notNull: true,
          defaultValue: true,
        },
        { name: "role", type: "TEXT", notNull: true, defaultValue: "user" },
      ],
      indexes: [
        { name: "idx_users_username", columns: ["username"] },
        { name: "idx_users_email", columns: ["email"] },
        { name: "idx_users_role", columns: ["role"] },
      ],
    },
    projects: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "name", type: "TEXT", notNull: true },
        { name: "description", type: "TEXT" },
        { name: "owner_id", type: "INTEGER", notNull: true },
        { name: "created_at", type: "TEXT", notNull: true },
        { name: "updated_at", type: "TEXT", notNull: true },
        { name: "status", type: "TEXT", notNull: true, defaultValue: "active" },
        {
          name: "visibility",
          type: "TEXT",
          notNull: true,
          defaultValue: "private",
        },
      ],
      indexes: [
        { name: "idx_projects_owner_id", columns: ["owner_id"] },
        { name: "idx_projects_status", columns: ["status"] },
        { name: "idx_projects_visibility", columns: ["visibility"] },
      ],
      foreignKeys: [
        { column: "owner_id", references: "users(id)", onDelete: "CASCADE" },
      ],
    },
    tasks: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "title", type: "TEXT", notNull: true },
        { name: "description", type: "TEXT" },
        { name: "project_id", type: "INTEGER", notNull: true },
        { name: "assigned_to", type: "INTEGER" },
        { name: "created_by", type: "INTEGER", notNull: true },
        { name: "created_at", type: "TEXT", notNull: true },
        { name: "updated_at", type: "TEXT", notNull: true },
        {
          name: "status",
          type: "TEXT",
          notNull: true,
          defaultValue: "pending",
        },
        {
          name: "priority",
          type: "TEXT",
          notNull: true,
          defaultValue: "medium",
        },
        { name: "due_date", type: "TEXT" },
      ],
      indexes: [
        { name: "idx_tasks_project_id", columns: ["project_id"] },
        { name: "idx_tasks_assigned_to", columns: ["assigned_to"] },
        { name: "idx_tasks_created_by", columns: ["created_by"] },
        { name: "idx_tasks_status", columns: ["status"] },
        { name: "idx_tasks_priority", columns: ["priority"] },
      ],
      foreignKeys: [
        {
          column: "project_id",
          references: "projects(id)",
          onDelete: "CASCADE",
        },
        {
          column: "assigned_to",
          references: "users(id)",
          onDelete: "SET NULL",
        },
        { column: "created_by", references: "users(id)", onDelete: "CASCADE" },
      ],
    },
    comments: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "content", type: "TEXT", notNull: true },
        { name: "task_id", type: "INTEGER", notNull: true },
        { name: "user_id", type: "INTEGER", notNull: true },
        { name: "created_at", type: "TEXT", notNull: true },
        { name: "updated_at", type: "TEXT", notNull: true },
        {
          name: "is_deleted",
          type: "BOOLEAN",
          notNull: true,
          defaultValue: false,
        },
      ],
      indexes: [
        { name: "idx_comments_task_id", columns: ["task_id"] },
        { name: "idx_comments_user_id", columns: ["user_id"] },
        { name: "idx_comments_is_deleted", columns: ["is_deleted"] },
      ],
      foreignKeys: [
        { column: "task_id", references: "tasks(id)", onDelete: "CASCADE" },
        { column: "user_id", references: "users(id)", onDelete: "CASCADE" },
      ],
    },
    audit_logs: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "table_name", type: "TEXT", notNull: true },
        { name: "record_id", type: "INTEGER", notNull: true },
        { name: "action", type: "TEXT", notNull: true },
        { name: "old_values", type: "TEXT" },
        { name: "new_values", type: "TEXT" },
        { name: "user_id", type: "INTEGER" },
        { name: "created_at", type: "TEXT", notNull: true },
      ],
      indexes: [
        { name: "idx_audit_logs_table_name", columns: ["table_name"] },
        { name: "idx_audit_logs_record_id", columns: ["record_id"] },
        { name: "idx_audit_logs_action", columns: ["action"] },
        { name: "idx_audit_logs_user_id", columns: ["user_id"] },
        { name: "idx_audit_logs_created_at", columns: ["created_at"] },
      ],
    },
    schema_versions: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "version", type: "TEXT", notNull: true, unique: true },
        { name: "description", type: "TEXT" },
        { name: "applied_at", type: "TEXT", notNull: true },
        { name: "checksum", type: "TEXT", notNull: true },
        {
          name: "is_active",
          type: "BOOLEAN",
          notNull: true,
          defaultValue: true,
        },
      ],
      indexes: [
        { name: "idx_schema_versions_version", columns: ["version"] },
        { name: "idx_schema_versions_is_active", columns: ["is_active"] },
      ],
    },
    performance_metrics: {
      columns: [
        { name: "id", type: "INTEGER", primaryKey: true, autoIncrement: true },
        { name: "query", type: "TEXT", notNull: true },
        { name: "execution_time", type: "REAL", notNull: true },
        { name: "memory_usage", type: "INTEGER", notNull: true },
        { name: "query_count", type: "INTEGER", notNull: true },
        { name: "timestamp", type: "TEXT", notNull: true },
        { name: "database_type", type: "TEXT", notNull: true },
      ],
      indexes: [
        { name: "idx_performance_metrics_query", columns: ["query"] },
        {
          name: "idx_performance_metrics_execution_time",
          columns: ["execution_time"],
        },
        { name: "idx_performance_metrics_timestamp", columns: ["timestamp"] },
        {
          name: "idx_performance_metrics_database_type",
          columns: ["database_type"],
        },
      ],
    },
  },
};

module.exports = TEST_CONFIG;
