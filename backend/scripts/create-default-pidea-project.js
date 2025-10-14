/**
 * Create Default PIDEA Project
 *
 * Automatically creates a project entry for the PIDEA workspace itself.
 * This ensures the frontend always has at least one project to display.
 */

const AutoSecurityManager = require("../infrastructure/auto/AutoSecurityManager");
const DatabaseConnection = require("../infrastructure/database/DatabaseConnection");
const Logger = require("@logging/Logger");
const path = require("path");
const fs = require("fs").promises;

const logger = new Logger("CreateDefaultPIDEAProject");

function getParam(n, dbType) {
  return dbType === "postgresql" ? `$${n}` : "?";
}

/**
 * Detect programming languages used in the project
 */
async function detectProjectLanguages(workspacePath) {
  const languages = [];

  try {
    // Check for common file extensions
    const languageMap = {
      ".js": "javascript",
      ".jsx": "jsx",
      ".ts": "typescript",
      ".tsx": "tsx",
      ".css": "css",
      ".scss": "sass",
      ".sass": "sass",
      ".sql": "sql",
      ".md": "markdown",
      ".json": "json",
      ".yaml": "yaml",
      ".yml": "yaml",
      ".sh": "shell",
      ".bash": "shell",
      ".zsh": "shell",
      ".dockerfile": "dockerfile",
      ".html": "html",
      ".xml": "xml",
      ".py": "python",
      ".java": "java",
      ".go": "go",
      ".rs": "rust",
      ".php": "php",
      ".rb": "ruby",
      ".cpp": "cpp",
      ".c": "c",
      ".h": "c",
      ".hpp": "cpp",
    };

    // Scan common directories for file types
    const directoriesToScan = [
      "backend",
      "frontend",
      "src",
      "lib",
      "scripts",
      "config",
      "database",
      "docs",
      "tests",
      "test",
    ];

    for (const dir of directoriesToScan) {
      const dirPath = path.join(workspacePath, dir);
      try {
        const files = await fs.readdir(dirPath, { recursive: true });

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (languageMap[ext] && !languages.includes(languageMap[ext])) {
            languages.push(languageMap[ext]);
          }
        }
      } catch (error) {
        // Directory doesn't exist, skip
        continue;
      }
    }

    // Also check root directory
    try {
      const rootFiles = await fs.readdir(workspacePath);
      for (const file of rootFiles) {
        const ext = path.extname(file).toLowerCase();
        if (languageMap[ext] && !languages.includes(languageMap[ext])) {
          languages.push(languageMap[ext]);
        }
      }
    } catch (error) {
      logger.debug("Could not scan root directory:", error.message);
    }

    logger.info("🔍 Detected languages:", languages);
    return languages;
  } catch (error) {
    logger.warn("Failed to detect project languages:", error.message);
    return [];
  }
}

/**
 * Detect PIDEA project information from current workspace
 */
async function detectPIDEAProjectInfo() {
  try {
    // Get the root workspace path (go up one level from backend/)
    const currentPath = process.cwd();
    const workspacePath = currentPath.endsWith("/backend")
      ? path.dirname(currentPath)
      : currentPath;
    const packageJsonPath = path.join(workspacePath, "package.json");

    // Default PIDEA project info
    let projectInfo = {
      id: "pidea-workspace",
      name: "PIDEA",
      description: "Personal IDE Agent - A unified development platform",
      workspacePath: workspacePath,
      type: "monorepo",
      framework: "node",
      language: "javascript", // Primary language
      languages: [
        "javascript",
        "jsx",
        "css",
        "sass",
        "sql",
        "markdown",
        "json",
        "yaml",
        "shell",
        "dockerfile",
      ],
      packageManager: "npm",
      status: "active",
      priority: 1,
      createdBy: "me",
      frontendPort: 4000, // Default Vite port
      backendPort: 3000, // Default Node.js port
      databasePort: 5432, // Default PostgreSQL port
    };

    // Read main package.json for PIDEA details
    try {
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
      const packageJson = JSON.parse(packageJsonContent);

      // Update with actual PIDEA info
      if (packageJson.name) {
        projectInfo.name = packageJson.name;
      }
      if (packageJson.description) {
        projectInfo.description = packageJson.description;
      }
      if (packageJson.version) {
        projectInfo.metadata = {
          ...projectInfo.metadata,
          version: packageJson.version,
          author: packageJson.author,
          license: packageJson.license,
        };
      }

      // Detect monorepo structure
      if (packageJson.workspaces && Array.isArray(packageJson.workspaces)) {
        projectInfo.type = "monorepo";
        projectInfo.metadata = {
          ...projectInfo.metadata,
          workspaces: packageJson.workspaces,
          isMonorepo: true,
          workspaceCount: packageJson.workspaces.length,
        };
      }

      // Detect ports from scripts and configuration
      if (packageJson.scripts) {
        const scripts = JSON.stringify(packageJson.scripts);

        // Look for specific PIDEA port patterns
        // Frontend: Vite default port 4000
        if (scripts.includes("vite")) {
          projectInfo.frontendPort = 4000;
        }

        // Backend: Node.js server default port 3000
        if (scripts.includes("server.js") || scripts.includes("start")) {
          projectInfo.backendPort = 3000;
        }

        // Database: PostgreSQL default port 5432
        if (scripts.includes("postgres") || scripts.includes("db:")) {
          projectInfo.databasePort = 5432;
        }
      }

      // Detect technologies from dependencies
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const techStack = [];

      if (dependencies.react) techStack.push("React");
      if (dependencies.vite) techStack.push("Vite");
      if (dependencies.tailwindcss) techStack.push("TailwindCSS");
      if (dependencies.playwright) techStack.push("Playwright");
      if (dependencies.jest) techStack.push("Jest");
      if (dependencies["@playwright/test"])
        techStack.push("Playwright Testing");
      if (dependencies["concurrently"]) techStack.push("Concurrently");
      if (dependencies["nodemon"]) techStack.push("Nodemon");
      if (dependencies["eslint"]) techStack.push("ESLint");

      if (techStack.length > 0) {
        projectInfo.metadata = {
          ...projectInfo.metadata,
          techStack: techStack,
          technologies: techStack.join(", "),
        };
      }

      // Detect additional languages from project structure
      const detectedLanguages = await detectProjectLanguages(workspacePath);
      if (detectedLanguages.length > 0) {
        projectInfo.languages = [
          ...new Set([...projectInfo.languages, ...detectedLanguages]),
        ];
        projectInfo.metadata = {
          ...projectInfo.metadata,
          detectedLanguages: detectedLanguages,
          totalLanguages: projectInfo.languages.length,
        };
      }
    } catch (error) {
      logger.warn("Could not read main package.json:", error.message);
    }

    // Try to detect backend-specific info
    try {
      const backendPackageJsonPath = path.join(
        workspacePath,
        "backend",
        "package.json",
      );
      const backendPackageJsonContent = await fs.readFile(
        backendPackageJsonPath,
        "utf8",
      );
      const backendPackageJson = JSON.parse(backendPackageJsonContent);

      if (backendPackageJson.name) {
        projectInfo.metadata = {
          ...projectInfo.metadata,
          backendName: backendPackageJson.name,
          backendVersion: backendPackageJson.version,
        };
      }
    } catch (error) {
      logger.debug("Could not read backend package.json:", error.message);
    }

    // Try to detect frontend-specific info
    try {
      const frontendPackageJsonPath = path.join(
        workspacePath,
        "frontend",
        "package.json",
      );
      const frontendPackageJsonContent = await fs.readFile(
        frontendPackageJsonPath,
        "utf8",
      );
      const frontendPackageJson = JSON.parse(frontendPackageJsonContent);

      if (frontendPackageJson.name) {
        projectInfo.metadata = {
          ...projectInfo.metadata,
          frontendName: frontendPackageJson.name,
          frontendVersion: frontendPackageJson.version,
        };
      }
    } catch (error) {
      logger.debug("Could not read frontend package.json:", error.message);
    }

    logger.info("🔍 Detected PIDEA project info:", {
      name: projectInfo.name,
      type: projectInfo.type,
      workspacePath: projectInfo.workspacePath,
      currentPath: currentPath,
      workspaces: projectInfo.metadata?.workspaces,
      languages: projectInfo.languages,
      totalLanguages: projectInfo.languages.length,
      ports: {
        frontend: projectInfo.frontendPort,
        backend: projectInfo.backendPort,
        database: projectInfo.databasePort,
      },
      techStack: projectInfo.metadata?.techStack,
    });

    return projectInfo;
  } catch (error) {
    logger.error("Failed to detect PIDEA project info:", error);
    throw error;
  }
}

async function createDefaultPIDEAProject() {
  try {
    logger.info("🏗️ Ensuring PIDEA project exists...");

    // Use the same configuration as the main application
    const autoSecurityManager = new AutoSecurityManager();
    const dbConfig = autoSecurityManager.getDatabaseConfig();

    const databaseConnection = new DatabaseConnection(dbConfig);

    try {
      await databaseConnection.connect();
      logger.info("✅ Connected to database");

      const dbType = databaseConnection.getType();

      // Check if PIDEA project already exists
      logger.info("🔍 Checking if PIDEA project already exists...");

      // First check by ID
      const checkResult = await databaseConnection.query(
        `SELECT id, name, workspace_path FROM projects WHERE id = ${getParam(1, dbType)}`,
        ["pidea-workspace"],
      );

      // Check if PIDEA project exists (by ID or any workspace path containing PIDEA)
      const checkByPathResult = await databaseConnection.query(
        `SELECT id, name, workspace_path FROM projects WHERE workspace_path LIKE ${getParam(1, dbType)}`,
        ["%/PIDEA%"],
      );

      logger.info("🔍 Check result:", {
        checkResultType: typeof checkResult,
        checkResultIsArray: Array.isArray(checkResult),
        checkResultHasRows: !!(checkResult && checkResult.rows),
        checkResultValue: checkResult,
      });

      logger.info("🔍 Check by path result:", {
        checkByPathResultType: typeof checkByPathResult,
        checkByPathResultIsArray: Array.isArray(checkByPathResult),
        checkByPathResultHasRows: !!(
          checkByPathResult && checkByPathResult.rows
        ),
        checkByPathResultValue: checkByPathResult,
      });

      const rows = checkResult.rows || checkResult;
      const pathRows = checkByPathResult.rows || checkByPathResult;

      if ((rows && rows.length > 0) || (pathRows && pathRows.length > 0)) {
        logger.info("✅ PIDEA project already exists");

        // If project exists but has wrong workspace path, update it
        if (pathRows && pathRows.length > 0) {
          const existingProject = pathRows[0];
          const correctWorkspacePath = process.cwd(); // Get current working directory dynamically

          if (existingProject.workspace_path !== correctWorkspacePath) {
            logger.info("🔄 Updating PIDEA project workspace path...");
            await databaseConnection.execute(
              `UPDATE projects SET workspace_path = ${getParam(1, dbType)}, updated_at = ${getParam(2, dbType)} WHERE id = ${getParam(3, dbType)}`,
              [
                correctWorkspacePath,
                new Date().toISOString(),
                existingProject.id,
              ],
            );
            logger.info("✅ PIDEA project workspace path updated");
          }
        }
        return;
      }

      // Detect project information
      const projectInfo = await detectPIDEAProjectInfo();

      logger.info("🏗️ Creating PIDEA project...");
      logger.info("📝 Project data:", {
        id: projectInfo.id,
        name: projectInfo.name,
        workspacePath: projectInfo.workspacePath,
        type: projectInfo.type,
        framework: projectInfo.framework,
      });

      const now = new Date().toISOString();
      const insertSql = `
        INSERT INTO projects (
          id, name, description, workspace_path, type,
          backend_port, frontend_port, database_port,
          framework, language, package_manager,
          status, priority, last_accessed, access_count,
          metadata, config, created_at, updated_at, created_by
        ) VALUES (
          ${getParam(1, dbType)},
          ${getParam(2, dbType)},
          ${getParam(3, dbType)},
          ${getParam(4, dbType)},
          ${getParam(5, dbType)},
          ${getParam(6, dbType)},
          ${getParam(7, dbType)},
          ${getParam(8, dbType)},
          ${getParam(9, dbType)},
          ${getParam(10, dbType)},
          ${getParam(11, dbType)},
          ${getParam(12, dbType)},
          ${getParam(13, dbType)},
          ${getParam(14, dbType)},
          ${getParam(15, dbType)},
          ${getParam(16, dbType)},
          ${getParam(17, dbType)},
          ${getParam(18, dbType)},
          ${getParam(19, dbType)},
          ${getParam(20, dbType)}
        )
      `;

      const insertResult = await databaseConnection.execute(insertSql, [
        projectInfo.id,
        projectInfo.name,
        projectInfo.description,
        projectInfo.workspacePath,
        projectInfo.type,
        projectInfo.backendPort || null,
        projectInfo.frontendPort || null,
        projectInfo.databasePort || null,
        projectInfo.framework,
        projectInfo.language,
        projectInfo.packageManager,
        projectInfo.status,
        projectInfo.priority,
        now, // last_accessed
        0, // access_count
        JSON.stringify(projectInfo.metadata || {}),
        JSON.stringify(projectInfo.config || {}),
        now, // created_at
        now, // updated_at
        projectInfo.createdBy,
      ]);

      logger.info("✅ PIDEA project created successfully");
    } finally {
      await databaseConnection.disconnect();
    }
  } catch (error) {
    logger.error("❌ Error creating PIDEA project:", error.message);
    throw error;
  }
}

module.exports = createDefaultPIDEAProject;
