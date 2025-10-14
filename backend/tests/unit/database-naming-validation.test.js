/**
 * Database Naming Validation Unit Tests
 *
 * Unit tests for database naming pattern validation and consistency checks.
 * Tests naming standards enforcement without requiring database connection.
 */

const Logger = require("@logging/Logger");

describe("Database Naming Validation Unit Tests", () => {
  let logger;

  beforeAll(() => {
    logger = new Logger("DatabaseNamingValidationUnitTest");
  });

  describe("Table Naming Pattern Validation", () => {
    test("should validate snake_case table names", () => {
      const validTableNames = [
        "users",
        "user_sessions",
        "projects",
        "tasks",
        "analysis",
        "project_interfaces",
        "task_file_events",
      ];

      const invalidTableNames = [
        "Users", // PascalCase
        "userSessions", // camelCase
        "user", // Singular
        "usr", // Abbreviation
        "user-sessions", // Hyphens
        "user.sessions", // Dots
        "123users", // Starts with number
        "users_", // Ends with underscore
        "_users", // Starts with underscore
      ];

      validTableNames.forEach((tableName) => {
        expect(validateTableName(tableName)).toBe(true);
      });

      invalidTableNames.forEach((tableName) => {
        expect(validateTableName(tableName)).toBe(false);
      });
    });

    test("should validate plural table names", () => {
      const validPluralNames = [
        "users",
        "projects",
        "tasks",
        "sessions",
        "interfaces",
        "events",
      ];

      const invalidSingularNames = [
        "user",
        "project",
        "task",
        "session",
        "interface",
        "event",
      ];

      validPluralNames.forEach((tableName) => {
        expect(validatePluralTableName(tableName)).toBe(true);
      });

      invalidSingularNames.forEach((tableName) => {
        expect(validatePluralTableName(tableName)).toBe(false);
      });
    });
  });

  describe("Column Naming Pattern Validation", () => {
    test("should validate snake_case column names", () => {
      const validColumnNames = [
        "id",
        "created_at",
        "updated_at",
        "user_id",
        "project_id",
        "is_active",
        "is_default",
        "metadata",
        "config",
        "settings",
      ];

      const invalidColumnNames = [
        "Id", // PascalCase
        "createdAt", // camelCase
        "user-id", // Hyphens
        "user.id", // Dots
        "123id", // Starts with number
        "id_", // Ends with underscore
        "_id", // Starts with underscore
      ];

      validColumnNames.forEach((columnName) => {
        expect(validateColumnName(columnName)).toBe(true);
      });

      invalidColumnNames.forEach((columnName) => {
        expect(validateColumnName(columnName)).toBe(false);
      });
    });

    test("should validate timestamp column names", () => {
      const validTimestampNames = [
        "created_at",
        "updated_at",
        "deleted_at",
        "event_timestamp",
      ];

      const invalidTimestampNames = [
        "timestamp",
        "createdAt",
        "updatedAt",
        "time",
        "date",
      ];

      validTimestampNames.forEach((columnName) => {
        expect(validateTimestampColumnName(columnName)).toBe(true);
      });

      invalidTimestampNames.forEach((columnName) => {
        expect(validateTimestampColumnName(columnName)).toBe(false);
      });
    });

    test("should validate ID column names", () => {
      const validIdNames = [
        "id",
        "user_id",
        "project_id",
        "task_id",
        "session_id",
      ];

      const invalidIdNames = [
        "Id",
        "userId",
        "projectId",
        "user-id",
        "user.id",
      ];

      validIdNames.forEach((columnName) => {
        expect(validateIdColumnName(columnName)).toBe(true);
      });

      invalidIdNames.forEach((columnName) => {
        expect(validateIdColumnName(columnName)).toBe(false);
      });
    });
  });

  describe("Index Naming Pattern Validation", () => {
    test("should validate index naming pattern", () => {
      const validIndexNames = [
        "idx_users_email",
        "idx_tasks_project_id",
        "idx_user_sessions_access_token",
        "idx_projects_created_at",
        "idx_tasks_project_status",
      ];

      const invalidIndexNames = [
        "users_email_index", // Wrong prefix order
        "idxUsersEmail", // camelCase
        "users_email_idx", // Wrong prefix
        "index_users_email", // Wrong prefix
        "idx-users-email", // Hyphens
      ];

      validIndexNames.forEach((indexName) => {
        expect(validateIndexName(indexName)).toBe(true);
      });

      invalidIndexNames.forEach((indexName) => {
        expect(validateIndexName(indexName)).toBe(false);
      });
    });
  });

  describe("Constraint Naming Pattern Validation", () => {
    test("should validate primary key naming", () => {
      const validPrimaryKeyNames = [
        "pk_users",
        "pk_projects",
        "pk_tasks",
        "pk_user_sessions",
      ];

      const invalidPrimaryKeyNames = [
        "primary_key",
        "pkUsers",
        "users_pk",
        "primary_users",
      ];

      validPrimaryKeyNames.forEach((constraintName) => {
        expect(validatePrimaryKeyName(constraintName)).toBe(true);
      });

      invalidPrimaryKeyNames.forEach((constraintName) => {
        expect(validatePrimaryKeyName(constraintName)).toBe(false);
      });
    });

    test("should validate foreign key naming", () => {
      const validForeignKeyNames = [
        "fk_tasks_project_id",
        "fk_user_sessions_user_id",
        "fk_projects_created_by",
      ];

      const invalidForeignKeyNames = [
        "foreign_key",
        "fkTasksProjectId",
        "tasks_project_id_fk",
        "foreign_tasks_project_id",
      ];

      validForeignKeyNames.forEach((constraintName) => {
        expect(validateForeignKeyName(constraintName)).toBe(true);
      });

      invalidForeignKeyNames.forEach((constraintName) => {
        expect(validateForeignKeyName(constraintName)).toBe(false);
      });
    });

    test("should validate unique constraint naming", () => {
      const validUniqueNames = [
        "uk_users_email",
        "uk_projects_name",
        "uk_tasks_title",
      ];

      const invalidUniqueNames = [
        "unique_key",
        "ukUsersEmail",
        "users_email_uk",
        "unique_users_email",
      ];

      validUniqueNames.forEach((constraintName) => {
        expect(validateUniqueConstraintName(constraintName)).toBe(true);
      });

      invalidUniqueNames.forEach((constraintName) => {
        expect(validateUniqueConstraintName(constraintName)).toBe(false);
      });
    });

    test("should validate check constraint naming", () => {
      const validCheckNames = [
        "chk_tasks_status",
        "chk_users_role",
        "chk_projects_priority",
      ];

      const invalidCheckNames = [
        "check_constraint",
        "chkTasksStatus",
        "tasks_status_chk",
        "check_tasks_status",
      ];

      validCheckNames.forEach((constraintName) => {
        expect(validateCheckConstraintName(constraintName)).toBe(true);
      });

      invalidCheckNames.forEach((constraintName) => {
        expect(validateCheckConstraintName(constraintName)).toBe(false);
      });
    });
  });

  describe("Naming Consistency Validation", () => {
    test("should validate naming consistency across database objects", () => {
      const databaseSchema = {
        tables: [
          {
            name: "users",
            columns: ["id", "email", "created_at", "updated_at"],
          },
          {
            name: "projects",
            columns: ["id", "name", "created_at", "updated_at"],
          },
          {
            name: "tasks",
            columns: ["id", "title", "project_id", "created_at", "updated_at"],
          },
        ],
        indexes: [
          "idx_users_email",
          "idx_projects_name",
          "idx_tasks_project_id",
        ],
        constraints: [
          "pk_users",
          "pk_projects",
          "pk_tasks",
          "fk_tasks_project_id",
        ],
      };

      const validationResult = validateDatabaseSchema(databaseSchema);
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test("should detect naming inconsistencies", () => {
      const databaseSchema = {
        tables: [
          {
            name: "Users",
            columns: ["Id", "Email", "created_at", "updated_at"],
          }, // PascalCase
          {
            name: "projects",
            columns: ["id", "name", "created_at", "updated_at"],
          },
        ],
        indexes: [
          "users_email_index", // Wrong prefix
          "idx_projects_name",
        ],
        constraints: [
          "primary_key", // Generic name
          "pk_projects",
        ],
      };

      const validationResult = validateDatabaseSchema(databaseSchema);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });
  });
});

// Helper functions for validation

function validateTableName(name) {
  const snakeCasePattern = /^[a-z][a-z0-9_]*[a-z0-9]$/;
  return snakeCasePattern.test(name);
}

function validatePluralTableName(name) {
  // Simple heuristic: ends with 's' or contains underscores
  return name.endsWith("s") || name.includes("_");
}

function validateColumnName(name) {
  const snakeCasePattern = /^[a-z][a-z0-9_]*[a-z0-9]$/;
  return snakeCasePattern.test(name);
}

function validateTimestampColumnName(name) {
  const validTimestampNames = [
    "created_at",
    "updated_at",
    "deleted_at",
    "event_timestamp",
  ];
  return validTimestampNames.includes(name);
}

function validateIdColumnName(name) {
  const idPattern = /^(id|[a-z][a-z0-9_]*_id)$/;
  return idPattern.test(name);
}

function validateIndexName(name) {
  const indexPattern = /^idx_[a-z][a-z0-9_]*_[a-z][a-z0-9_]*$/;
  return indexPattern.test(name);
}

function validatePrimaryKeyName(name) {
  const pkPattern = /^pk_[a-z][a-z0-9_]*$/;
  return pkPattern.test(name);
}

function validateForeignKeyName(name) {
  const fkPattern = /^fk_[a-z][a-z0-9_]*_[a-z][a-z0-9_]*$/;
  return fkPattern.test(name);
}

function validateUniqueConstraintName(name) {
  const ukPattern = /^uk_[a-z][a-z0-9_]*_[a-z][a-z0-9_]*$/;
  return ukPattern.test(name);
}

function validateCheckConstraintName(name) {
  const chkPattern = /^chk_[a-z][a-z0-9_]*_[a-z][a-z0-9_]*$/;
  return chkPattern.test(name);
}

function validateDatabaseSchema(schema) {
  const errors = [];

  // Validate tables
  schema.tables.forEach((table) => {
    if (!validateTableName(table.name)) {
      errors.push(`Invalid table name: ${table.name}`);
    }

    // Validate columns
    table.columns.forEach((column) => {
      if (!validateColumnName(column)) {
        errors.push(`Invalid column name: ${table.name}.${column}`);
      }
    });
  });

  // Validate indexes
  schema.indexes.forEach((index) => {
    if (!validateIndexName(index)) {
      errors.push(`Invalid index name: ${index}`);
    }
  });

  // Validate constraints
  schema.constraints.forEach((constraint) => {
    if (
      !validatePrimaryKeyName(constraint) &&
      !validateForeignKeyName(constraint) &&
      !validateUniqueConstraintName(constraint) &&
      !validateCheckConstraintName(constraint)
    ) {
      errors.push(`Invalid constraint name: ${constraint}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}
