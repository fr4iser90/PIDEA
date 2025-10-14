require("module-alias/register");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const Application = require("./Application");
const { getLogger } = require("@logging/Logger");
const logger = getLogger("Server");

function getParam(n, dbType) {
  return dbType === "postgresql" ? `$${n}` : "?";
}

async function ensureDefaultUser() {
  try {
    logger.info("👤 Ensuring default user exists...");

    // Get DI Container
    const {
      getServiceContainer,
    } = require("./infrastructure/dependency-injection/ServiceContainer");
    const container = getServiceContainer();

    // Register core services as singletons
    const AutoSecurityManager = require("./infrastructure/auto/AutoSecurityManager");
    const DatabaseConnection = require("./infrastructure/database/DatabaseConnection");
    const createDefaultUser = require("./scripts/create-default-user");

    // Register AutoSecurityManager as singleton
    if (!container.singletons.has("autoSecurityManager")) {
      const autoSecurityManager = new AutoSecurityManager();
      container.registerSingleton("autoSecurityManager", autoSecurityManager);
    }

    const autoSecurityManager = container.resolve("autoSecurityManager");
    const dbConfig = autoSecurityManager.getDatabaseConfig();

    // Register DatabaseConnection as singleton
    if (!container.singletons.has("databaseConnection")) {
      const databaseConnection = new DatabaseConnection(dbConfig);
      await databaseConnection.connect();
      container.registerSingleton("databaseConnection", databaseConnection);
    }

    const databaseConnection = container.resolve("databaseConnection");

    const dbType = databaseConnection.getType();

    // Check if user exists
    const checkResult = await databaseConnection.query(
      `SELECT id, email, username FROM users WHERE id = ${getParam(1, dbType)}`,
      ["me"],
    );

    if (checkResult && checkResult.length > 0) {
      logger.info("✅ Default user already exists");
      // Don't disconnect - let Application.js use the same connection
      return;
    }

    // Create default user
    try {
      await createDefaultUser();
    } catch (createError) {
      // Check if it's a duplicate key error (user already exists)
      if (
        createError.message.includes(
          "duplicate key value violates unique constraint",
        )
      ) {
        logger.info("✅ Default user already exists, skipping creation");
      } else {
        logger.error("❌ Error creating default user:", createError.message);
        logger.warn("⚠️ Continuing without default user...");
      }
    }
    // Don't disconnect - let Application.js use the same connection
  } catch (error) {
    logger.error("❌ Error ensuring default user:", error.message);
    // Don't exit, just log the error and continue
    logger.warn("⚠️ Continuing without default user...");
  }
}

async function ensurePIDEAProject() {
  try {
    logger.info("🏗️ Ensuring PIDEA project exists...");

    // Get DI Container
    const {
      getServiceContainer,
    } = require("./infrastructure/dependency-injection/ServiceContainer");
    const container = getServiceContainer();

    // Register core services as singletons
    const AutoSecurityManager = require("./infrastructure/auto/AutoSecurityManager");
    const DatabaseConnection = require("./infrastructure/database/DatabaseConnection");
    const createDefaultPIDEAProject = require("./scripts/create-default-pidea-project");

    // Register AutoSecurityManager as singleton
    if (!container.singletons.has("autoSecurityManager")) {
      const autoSecurityManager = new AutoSecurityManager();
      container.registerSingleton("autoSecurityManager", autoSecurityManager);
    }

    const autoSecurityManager = container.resolve("autoSecurityManager");
    const dbConfig = autoSecurityManager.getDatabaseConfig();

    // Register DatabaseConnection as singleton
    if (!container.singletons.has("databaseConnection")) {
      const databaseConnection = new DatabaseConnection(dbConfig);
      await databaseConnection.connect();
      container.registerSingleton("databaseConnection", databaseConnection);
    }

    const databaseConnection = container.resolve("databaseConnection");

    const dbType = databaseConnection.getType();

    // Check if PIDEA project exists
    const checkResult = await databaseConnection.query(
      `SELECT id, name, workspace_path FROM projects WHERE id = ${getParam(1, dbType)}`,
      ["pidea-workspace"],
    );

    const rows = checkResult.rows || checkResult;
    if (rows && rows.length > 0) {
      logger.info("✅ PIDEA project already exists");
      // Don't disconnect - let Application.js use the same connection
      return;
    }

    // Create PIDEA project
    await createDefaultPIDEAProject();
    // Don't disconnect - let Application.js use the same connection
  } catch (error) {
    logger.error("❌ Error ensuring PIDEA project:", error.message);
    // Don't exit, just log the error and continue
    logger.warn("⚠️ Continuing without PIDEA project...");
  }
}

async function main() {
  // Ensure default user exists before starting application
  await ensureDefaultUser();

  // Ensure PIDEA project exists before starting application
  await ensurePIDEAProject();

  const centralizedConfig = require("./config/centralized-config");

  // Validate configuration before starting
  const validation = centralizedConfig.validate();
  if (!validation.isValid) {
    logger.error("❌ Configuration validation failed:");
    validation.errors.forEach((error) => logger.error(`  - ${error}`));
    process.exit(1);
  }

  if (validation.warnings.length > 0) {
    logger.warn("⚠️ Configuration warnings:");
    validation.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
  }

  const app = new Application({
    port: centralizedConfig.backendPort,
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully...");
    await app.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully...");
    await app.stop();
    process.exit(0);
  });

  try {
    await app.start();
  } catch (error) {
    logger.error("Failed to start application:", error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { Application, main };
