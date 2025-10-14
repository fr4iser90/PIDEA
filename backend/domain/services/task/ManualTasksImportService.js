/**
 * ManualTasksImportService - Importiert Manual Tasks direkt aus dem Workspace in die Datenbank
 * DATABASE ONLY - Keine TEMP-Logik!
 */
const fs = require("fs").promises;
const path = require("path");
const Logger = require("@logging/Logger");
const TaskContentHashService = require("@domain/services/task/TaskContentHashService");
const TaskFileLocationService = require("@domain/services/task/TaskFileLocationService");
const TaskEventStore = require("@domain/services/task/TaskEventStore");
const logger = new Logger("ImportService");

class ManualTasksImportService {
  constructor(
    browserManager,
    taskService,
    taskRepository,
    fileSystemService,
    contentHashService = null,
    fileLocationService = null,
    eventStore = null,
  ) {
    this.browserManager = browserManager;
    this.taskService = taskService;
    this.taskRepository = taskRepository;
    this.fileSystemService = fileSystemService;

    // Initialize new services
    this.contentHashService =
      contentHashService || new TaskContentHashService(fileSystemService);
    this.fileLocationService =
      fileLocationService || new TaskFileLocationService(fileSystemService);
    this.eventStore = eventStore;

    this.logger = new Logger("ManualTasksImportService");
  }

  /**
   * HAUPTMETHODE: Importiere Manual Tasks direkt aus Workspace in die Datenbank
   * @param {string} projectId - Projekt ID
   * @param {string} workspacePath - Workspace Pfad
   * @returns {Promise<Object>} Import Ergebnis
   */
  async importManualTasksFromWorkspace(projectId, workspacePath) {
    logger.info(
      `🔄 [ManualTasksImportService] Starting manual tasks import for project ${projectId} from workspace: ${workspacePath}`,
    );

    try {
      return await this._importFromWorkspace(workspacePath, projectId);
    } catch (error) {
      logger.error(`❌ [ManualTasksImportService] Import failed:`, error);
      throw error;
    }
  }

  /**
   * Importiere aus Workspace direkt in die Datenbank
   */
  async _importFromWorkspace(workspacePath, projectId) {
    try {
      logger.info(
        `🔄 [ManualTasksImportService] Importing from workspace to database: ${workspacePath}`,
      );
      if (!workspacePath) {
        throw new Error("No workspace path provided");
      }

      // ✅ NEW: Initialize completion statistics
      let completedCount = 0;
      let totalProcessedFiles = 0;
      let skippedCount = 0;
      let importedCount = 0;

      // Updated to scan the new status-based structure
      const roadmapDir = path.join(workspacePath, "docs/09_roadmap");
      // Hilfsfunktion: rekursiv alle .md-Dateien finden (EXCLUDING completed directories)
      async function getAllMarkdownFiles(dir) {
        let results = [];
        const list = await fs.readdir(dir);
        for (const file of list) {
          const filePath = path.join(dir, file);
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            // ✅ FIXED: Process completed directories but only import new tasks
            results = results.concat(await getAllMarkdownFiles(filePath));
          } else if (file.endsWith(".md")) {
            results.push(filePath);
          }
        }
        return results;
      }
      const allFiles = await getAllMarkdownFiles(roadmapDir);
      logger.info(
        `📁 Found ${allFiles.length} markdown files in ${roadmapDir}`,
      );
      const importedTasks = [];
      for (const filePath of allFiles) {
        // Updated path logic for new status-based structure
        const rel = path.relative(roadmapDir, filePath);
        const parts = rel.split(path.sep);
        if (parts.length < 3) {
          logger.debug(
            `⏭️ Skipping file with insufficient path parts: ${rel} (${parts.length} parts)`,
          );
          continue; // status/priority/category/file or status/category/file
        }

        // New structure: status/priority/category/file or status/category/file
        let status, priority, category;
        if (parts[0] === "completed") {
          status = "completed";
          if (parts[1].includes("q")) {
            // completed/2025-q3/category/file
            priority = "medium"; // Default for completed
            category = parts[2];
          } else if (parts[1].includes("-priority")) {
            // Handle legacy medium-priority, high-priority, etc. (convert to simple priority)
            priority = parts[1].replace("-priority", "");
            category = parts[2];
          } else {
            // completed/category/file
            priority = "medium";
            category = parts[1];
          }
        } else if (parts[0] === "pending") {
          status = "pending";
          // Check if second part is a priority or category
          if (["high", "medium", "low", "critical"].includes(parts[1])) {
            priority = parts[1];
            category = parts[2];
          } else if (parts[1].includes("-priority")) {
            // Handle legacy medium-priority, high-priority, etc. (convert to simple priority)
            priority = parts[1].replace("-priority", "");
            category = parts[2];
          } else {
            priority = "medium"; // Default
            category = parts[1];
          }
        } else if (parts[0] === "in-progress") {
          status = "in_progress";
          // Check if second part is a priority or category
          if (["high", "medium", "low", "critical"].includes(parts[1])) {
            priority = parts[1];
            category = parts[2];
          } else if (parts[1].includes("-priority")) {
            // Handle legacy medium-priority, high-priority, etc. (convert to simple priority)
            priority = parts[1].replace("-priority", "");
            category = parts[2];
          } else {
            priority = "medium"; // Default for in_progress
            category = parts[1];
          }
        } else if (parts[0] === "failed") {
          status = "failed";
          // Check if second part is a priority or category
          if (["high", "medium", "low", "critical"].includes(parts[1])) {
            priority = parts[1];
            category = parts[2];
          } else if (parts[1].includes("-priority")) {
            // Handle legacy medium-priority, high-priority, etc. (convert to simple priority)
            priority = parts[1].replace("-priority", "");
            category = parts[2];
          } else {
            priority = "medium"; // Default for failed
            category = parts[1];
          }
        } else {
          // ✅ FIXED: Handle old structure (docs/09_roadmap/tasks/category/task/)
          if (parts[0] === "tasks") {
            status = "pending"; // Default for old structure
            priority = "medium"; // Default for old structure
            category = parts[1]; // Category is the second part
          } else {
            // Fallback for other paths
            status = "pending";
            priority = "medium";
            category = parts[0];
          }
        }

        // Extract filename and task name
        const filename = parts[parts.length - 1]; // Last part is always the filename

        // ✅ FIXED: Extract directory name (task folder name) instead of filename
        // The task directory is ALWAYS the second-to-last part (before the filename)
        const taskDirectoryName = parts[parts.length - 2]; // This is the actual folder name (e.g., "status-badge-ui-improvements")

        let name = filename
          .replace(".md", "")
          .replace("-index", "")
          .replace("-implementation", "")
          .replace("-phase-", "");

        // ✅ IMPROVED: Better title formatting
        // Convert kebab-case to Title Case and handle special cases
        name = name
          .split("-")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");

        // ✅ FIXED: Don't add "Master Index" here - it will be added later in title creation
        // This prevents double "Master Index" entries
        // Typ und Phase anhand des Dateinamens bestimmen
        let type = null,
          phase = null;
        if (filename.endsWith("-index.md")) {
          type = "feature_index";
        } else if (filename.match(/-phase-(\d+)\.md$/)) {
          type = "feature_phase";
          phase = filename.match(/-phase-(\d+)\.md$/)[1];
        } else if (filename.endsWith("-implementation.md")) {
          type = "feature_implementation";
        } else if (filename.endsWith("-summary.md")) {
          type = "feature_summary";
        } else {
          type = "manual"; // Fallback für sonstige Dateien
        }

        // ✅ IMPORTANT: Import index files as tasks, fallback to implementation if no index exists
        if (type !== "feature_index" && type !== "feature_implementation") {
          logger.debug(
            `Skipping non-index/implementation file: ${filename} (type: ${type})`,
          );
          continue;
        }

        // If this is an implementation file, check if an index file already exists
        if (type === "feature_implementation") {
          const indexFilename = filename.replace(
            "-implementation.md",
            "-index.md",
          );
          const indexFilePath = path.join(
            path.dirname(filePath),
            indexFilename,
          );
          try {
            await fs.access(indexFilePath);
            // Index file exists, skip this implementation file
            logger.debug(
              `Skipping implementation file ${filename} - index file exists`,
            );
            continue;
          } catch (error) {
            // Index file doesn't exist, use this implementation file as fallback
            logger.debug(
              `Using implementation file ${filename} as fallback (no index file found)`,
            );
          }
        }

        // Determine structure type for metadata
        let structure = "implementation"; // default
        if (filename.endsWith("-index.md")) {
          structure = "index";
        } else if (filename.endsWith("-implementation.md")) {
          structure = "implementation";
        } else if (filename.match(/-phase-(\d+)\.md$/)) {
          structure = "phase";
        } else if (filename.endsWith("-summary.md")) {
          structure = "summary";
        }
        const content = await fs.readFile(filePath, "utf8");

        // Erstelle einen eindeutigen Identifier für das Feature
        const featureId = `${category}_${name}`;

        // Parse Index File für Progress-Informationen
        let progressInfo = {};
        if (structure === "index") {
          progressInfo = this._parseIndexFileContent(content);
        } else if (structure === "implementation") {
          // ✅ FIXED: Also parse implementation files for status and progress
          progressInfo = this._parseIndexFileContent(content);
        }

        // Titel: name + ggf. Phase (OHNE Master Index!)
        let title;
        if (structure === "phase") {
          title = `${name} Phase ${phase}`;
        } else {
          title = name; // Kein "Master Index" mehr!
        }
        title = title.replace(/-/g, " ");

        const redundantSuffixes = [
          { pattern: /\s+Master\s+Index\s*/g, name: "Master Index" },
          { pattern: /\s+Index\s*/g, name: "Index" },
          { pattern: /\s+Task\s*/g, name: "Task" },
          { pattern: /\s+Implementation\s*/g, name: "Implementation" },
          { pattern: /\s+Plan\s*/g, name: "Plan" },
          { pattern: /\s+Phase\s+\d+\s*/g, name: "Phase X" },
        ];

        for (const suffix of redundantSuffixes) {
          const originalTitle = title;
          title = title.replace(suffix.pattern, " ");
          title = title.replace(/\s+/g, " ").trim(); // Clean up multiple spaces
          if (title !== originalTitle) {
            logger.info(`🧹 Removed "${suffix.name}" from title: "${title}"`);
          }
        }

        // ✅ IMPROVED: Better duplicate checking with normalized title
        const normalizedTitle = title.toLowerCase().trim();

        // Check for exact match first
        const existing = await this.taskRepository.findAll({
          title: title,
          projectId: projectId,
        });

        // Also check for case-insensitive matches
        const allTasks = await this.taskRepository.findByProject(projectId);
        const similarTask = allTasks.find(
          (task) => task.title.toLowerCase().trim() === normalizedTitle,
        );

        logger.debug(
          `🔍 Checking for existing task: "${title}" in project "${projectId}" - Found: ${existing.length}, Similar: ${similarTask ? 1 : 0}`,
        );

        if (existing.length === 0 && !similarTask) {
          // Markdown content is the SINGLE source of truth for status
          // Status is determined ONLY from markdown content, NOT from directory path
          let taskStatus;

          if (content) {
            // Extract status from markdown content using content hash service
            taskStatus =
              await this.contentHashService.extractStatusFromContent(content);
            logger.debug(
              `📄 Status determined from markdown content: ${taskStatus} for task: ${title}`,
            );
          } else {
            // Fallback to pending if no content available
            taskStatus = "pending";
            logger.warn(
              `⚠️ No content available, defaulting to pending for task: ${title}`,
            );
          }

          // Status is determined ONLY from markdown content
          // Directory path is used ONLY for file location metadata, NOT for status determination

          // ✅ FIXED: Better priority detection from content
          let taskPriority = priority;
          if (content) {
            // Look for priority in content
            const priorityMatch = content.match(
              /priority[:\s]+(high|medium|low|critical)/i,
            );
            if (priorityMatch) {
              taskPriority = priorityMatch[1].toLowerCase();
            }
            // Look for priority indicators in content (more comprehensive)
            else if (
              content.includes("**Priority**: High") ||
              content.includes("Priority: High") ||
              content.includes("🔥 High")
            ) {
              taskPriority = "high";
            } else if (
              content.includes("**Priority**: Medium") ||
              content.includes("Priority: Medium") ||
              content.includes("⚡ Medium")
            ) {
              taskPriority = "medium";
            } else if (
              content.includes("**Priority**: Low") ||
              content.includes("Priority: Low") ||
              content.includes("📝 Low")
            ) {
              taskPriority = "low";
            } else if (
              content.includes("**Priority**: Critical") ||
              content.includes("Priority: Critical") ||
              content.includes("🚨 Critical")
            ) {
              taskPriority = "critical";
            }
          }

          // ✅ FIXED: Better category detection from content
          let taskCategory = category;
          if (content) {
            // Look for category in content
            const categoryMatch = content.match(
              /category[:\s]+(backend|frontend|performance|security|architecture|general)/i,
            );
            if (categoryMatch) {
              taskCategory = categoryMatch[1].toLowerCase();
            }
            // Look for category indicators in content
            else if (
              content.includes("**Category**: Backend") ||
              content.includes("Category: Backend")
            ) {
              taskCategory = "backend";
            } else if (
              content.includes("**Category**: Frontend") ||
              content.includes("Category: Frontend")
            ) {
              taskCategory = "frontend";
            } else if (
              content.includes("**Category**: Performance") ||
              content.includes("Category: Performance")
            ) {
              taskCategory = "performance";
            } else if (
              content.includes("**Category**: Security") ||
              content.includes("Category: Security")
            ) {
              taskCategory = "security";
            } else if (
              content.includes("**Category**: Architecture") ||
              content.includes("Category: Architecture")
            ) {
              taskCategory = "architecture";
            }
          }

          // Auto-calculate progress based on status if not found in content
          let taskProgress = progressInfo.overallProgress;
          if (!taskProgress && taskStatus === "completed") {
            taskProgress = 100;
          } else if (!taskProgress && taskStatus === "in_progress") {
            taskProgress = 50;
          } else if (!taskProgress && taskStatus === "failed") {
            taskProgress = 0;
          } else if (!taskProgress) {
            taskProgress = 0;
          }

          // Erstelle Task mit Gruppierungs-Metadaten
          const taskMetadata = {
            category,
            name,
            phase,
            filename,
            sourcePath: filePath, // ✅ FIXED: Rename to sourcePath to avoid confusion
            taskDirectoryName: taskDirectoryName, // ✅ NEW: Store the actual directory name
            importedAt: new Date(),
            featureId, // Eindeutige ID für das Feature
            featureGroup: `${category}/${name}`, // Gruppierungs-Key
            projectPath: workspacePath, // ✅ Setze projectPath beim Import
            structure, // ✅ Structure type (index, phase, implementation, summary)
            // ✅ Remove status and progress from metadata since they're now main fields
            ...Object.fromEntries(
              Object.entries(progressInfo).filter(
                ([key]) => key !== "status" && key !== "overallProgress",
              ),
            ),
          };

          // Füge Structure-spezifische Metadaten hinzu
          if (structure === "index") {
            taskMetadata.isIndexTask = true;
            taskMetadata.indexForFeature = featureId;
          } else if (structure === "phase") {
            taskMetadata.phaseNumber = parseInt(phase);
            taskMetadata.isPhaseTask = true;
          } else if (structure === "implementation") {
            taskMetadata.isImplementationTask = true;
          } else if (structure === "summary") {
            taskMetadata.isSummaryTask = true;
          }

          // ✅ FIXED: Extract full task details from markdown content
          const taskDetails = this.extractTaskDetailsFromMarkdown(
            content,
            filename,
          );

          // ✅ FIXED: Prepare task data with timestamps from markdown file
          const taskData = {
            title: title,
            description:
              taskDetails.description ||
              `Manual task imported from ${filename}`,
            type: "manual",
            priority: taskPriority, // This is the actual priority (high, medium, low, critical)
            status: taskStatus,
            progress: taskProgress,
            category: taskCategory,
            projectId: projectId,
            createdBy: "me",
            // ✅ NEW: Add content hash and file path for content addressable storage
            contentHash: content
              ? await this.contentHashService.generateContentHash(content)
              : null,
            filePath: filePath, // Store current file path for metadata tracking
            lastSyncedAt: new Date().toISOString(),
            metadata: {
              ...taskMetadata,
              ...taskDetails.metadata,
              sourceFile: filename,
              sourcePath: filePath,
              // ✅ FIXED: Add content for frontend display
              content: content,
              htmlContent: content,
              steps: taskDetails.metadata.steps || [],
              requirements: taskDetails.metadata.requirements || [],
              acceptanceCriteria: taskDetails.metadata.acceptanceCriteria || [],
              // ✅ FIXED: Add new status-based path structure
              newPath: this.generateNewStatusBasedPath(
                taskStatus,
                taskPriority,
                taskCategory,
                name,
              ),
            },
          };

          if (progressInfo.createdDate) {
            taskData.createdAt = new Date(progressInfo.createdDate);
            logger.info(
              `📅 Set task created date from markdown: ${progressInfo.createdDate}`,
            );
          }

          if (progressInfo.lastUpdatedDate) {
            taskData.updatedAt = new Date(progressInfo.lastUpdatedDate);
            logger.info(
              `📅 Set task last updated date from markdown: ${progressInfo.lastUpdatedDate}`,
            );
          }

          if (progressInfo.completionDate) {
            taskData.completedAt = new Date(progressInfo.completionDate);
            logger.info(
              `📅 Set task completion date from markdown: ${progressInfo.completionDate}`,
            );
          } else if (taskStatus === "completed") {
            // Auto-set completion date for completed tasks
            taskData.completedAt = new Date();
            logger.info(
              `📅 Auto-set completion date for completed task: ${title}`,
            );
          }

          // ✅ FIXED: Create task with explicit status and progress
          const task = await this.taskService.createTask(
            projectId,
            title,
            taskData.description,
            taskData.priority,
            taskData.type,
            taskData.category,
            taskData.metadata, // Pass object directly, not JSON string
          );

          // ✅ FIXED: Update task status and progress after creation
          if (taskStatus !== "pending") {
            task.updateStatus(taskStatus);
            logger.debug(`🔧 Updated task status to: ${taskStatus}`);
          }

          // ✅ FIXED: Set progress in metadata for frontend compatibility
          task.setMetadata("progress", taskProgress);
          logger.debug(`🔧 Set task progress to: ${taskProgress}%`);

          // ✅ FIXED: Save the updated task
          await this.taskRepository.update(task.id, task);
          logger.debug(`💾 Saved updated task to database`);

          // ✅ NEW: Record import event if event store is available
          if (this.eventStore) {
            try {
              await this.eventStore.recordStatusChangeEvent(
                task.id,
                "pending", // Initial status for new tasks
                taskStatus,
                {
                  importMethod: "manual_import",
                  sourceFile: filename,
                  sourcePath: filePath,
                  contentHash: taskData.contentHash,
                },
                "system",
              );
              logger.debug(`📝 Recorded import event for task: ${task.id}`);
            } catch (eventError) {
              logger.warn(
                `⚠️ Failed to record import event for task ${task.id}:`,
                eventError.message,
              );
            }
          }

          // 🆕 NEW: Trigger automatic file movement for completed tasks (NEW TASKS)
          if (
            taskStatus === "completed" &&
            this.taskService?.statusTransitionService
          ) {
            try {
              logger.debug(
                `🔄 Triggering automatic file movement for new completed task: ${title}`,
              );
              await this.taskService.statusTransitionService.moveTaskToCompleted(
                task.id,
              );
              logger.debug(
                `✅ Successfully moved files for new completed task: ${title}`,
              );
            } catch (moveError) {
              logger.warn(
                `⚠️ Failed to move files for new completed task ${title}:`,
                moveError.message,
              );
              // Don't fail the import if file movement fails
            }
          }

          // ✅ NEW: Track completion statistics
          totalProcessedFiles++;
          if (taskStatus === "completed") {
            completedCount++;
          }

          logger.debug(
            `✅ Created task: "${title}" (${type}) for project "${projectId}" with status: ${taskStatus}, progress: ${taskProgress}%`,
          );
          importedTasks.push(task);
        } else {
          // ✅ FIXED: Skip existing tasks to avoid re-processing
          skippedCount++;
          logger.debug(
            `⏭️ Skipping existing task to avoid re-processing: "${title}"`,
          );
          continue;
        }
      }
      // ✅ NEW: Log completion summary
      const completionRate =
        totalProcessedFiles > 0
          ? Math.round((completedCount / totalProcessedFiles) * 100)
          : 0;
      logger.info(
        `📊 IMPORT SUMMARY: ${importedCount} imported, ${skippedCount} skipped, ${completedCount}/${totalProcessedFiles} completed (${completionRate}%)`,
      );

      // Commit database transaction
      logger.info(
        `💾 Committing database transaction for ${importedTasks.length} tasks`,
      );

      return {
        importedTasks,
        totalFiles: allFiles.length,
        importedCount: importedTasks.length,
        completedCount,
        completionRate,
        workspacePath,
      };
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Import from workspace failed:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Parse markdown content für Task-Info
   */
  _parseManualTaskFromMarkdown(content, filename) {
    try {
      // Extract title from first line
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch
        ? titleMatch[1].trim()
        : filename.replace(".md", "");

      // Extract priority
      let priority = "medium";
      if (content.includes("KRITISCH") || content.includes("CRITICAL")) {
        priority = "critical";
      } else if (content.includes("HIGH") || content.includes("HOCH")) {
        priority = "high";
      } else if (
        content.includes("LOW") ||
        content.includes("NICHTIG") ||
        content.includes("NIEDRIG")
      ) {
        priority = "low";
      }

      // All manual tasks from roadmap/features should be 'documentation' type
      let type = "documentation";

      // Determine structure type for metadata
      let structure = "implementation"; // default
      if (
        content.includes("Master Index") ||
        content.includes("📋 Task Overview")
      ) {
        structure = "index";
      } else if (filename.includes("Phase")) {
        structure = "phase";
      } else if (filename.includes("summary") || content.includes("Summary")) {
        structure = "summary";
      } else if (
        filename.includes("implementation") ||
        content.includes("Implementation")
      ) {
        structure = "implementation";
      }

      // Extract category from filename or content
      let category = null;
      const categoryMatch = filename.match(/^(\w+)_/);
      if (categoryMatch) {
        category = categoryMatch[1];
      } else if (content.includes("Category:")) {
        const categoryMatch = content.match(/Category:\s*(\w+)/i);
        if (categoryMatch) {
          category = categoryMatch[1];
        }
      }

      return {
        title,
        priority,
        type,
        category,
        structure, // ✅ Return structure for metadata
        metadata: {},
      };
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Error parsing markdown:`,
        error,
      );
      return null;
    }
  }

  /**
   * Parse Index File für Progress-Informationen
   */
  _parseIndexFileContent(content) {
    try {
      const progressInfo = {};

      // Extract overall progress
      const progressMatch = content.match(/Overall Progress.*?(\d+)%/);
      if (progressMatch) {
        progressInfo.overallProgress = parseInt(progressMatch[1]);
      } else {
        // Calculate progress from phases if no explicit progress given
        progressInfo.overallProgress =
          this._calculateProgressFromPhases(content);
      }

      // Extract current phase
      const currentPhaseMatch = content.match(/Current Phase.*?Phase (\d+)/);
      if (currentPhaseMatch) {
        progressInfo.currentPhase = parseInt(currentPhaseMatch[1]);
      }

      // Extract status with robust regex for various formats
      const statusPatterns = [
        // Pattern 1: Status with emoji and text (✅ COMPLETED, ✅ Complete, etc.)
        /Status.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z_]+)/,
        // Pattern 2: Just status text (COMPLETED, Complete, completed, etc.)
        /Status.*?([A-Za-z_]+)/,
        // Pattern 3: Status in different formats (✅ COMPLETED, ✅ Complete, etc.)
        /Status.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z\s_]+)/,
        // Pattern 4: Status with dashes (in_progress, in_progress, etc.)
        /Status.*?([A-Za-z\-_\s]+)/,
        // Pattern 5: Status with emoji and ALL CAPS text (✅ COMPLETED)
        /Status.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Z]+)/,
        // Pattern 6: Status with emoji and mixed case (✅ COMPLETED, ✅ Complete)
        /Status.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z]+)/,
        // Pattern 7: Markdown format with bold (**Status**: ✅ COMPLETED)
        /\*\*Status\*\*.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z]+)/,
        // Pattern 8: Markdown format with bold and ALL CAPS (**Status**: ✅ COMPLETED)
        /\*\*Status\*\*.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Z]+)/,
        // Pattern 9: Markdown format with dash and bold (- **Status**: ✅ COMPLETED)
        /-\s*\*\*Status\*\*.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z]+)/,
        // Pattern 10: Markdown format with dash, bold and ALL CAPS (- **Status**: ✅ COMPLETED)
        /-\s*\*\*Status\*\*.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Z]+)/,
        // Pattern 11: General markdown format with any prefix (- **Status**: ✅ COMPLETED)
        /.*\*\*Status\*\*.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Za-z]+)/,
        // Pattern 12: General markdown format with any prefix and ALL CAPS (- **Status**: ✅ COMPLETED)
        /.*\*\*Status\*\*.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*([A-Z]+)/,
      ];

      let statusDetected = false;
      for (const pattern of statusPatterns) {
        const statusMatch = content.match(pattern);
        if (statusMatch) {
          const emoji = statusMatch[1] || "";
          const statusText = (statusMatch[2] || statusMatch[1] || "")
            .toLowerCase()
            .trim();

          // Normalize status text
          let normalizedStatus = statusText;

          // Handle various completion statuses
          if (
            statusText.includes("complete") ||
            statusText.includes("done") ||
            statusText.includes("finished") ||
            statusText === "COMPLETED" ||
            statusText === "complete" ||
            statusText === "Complete"
          ) {
            normalizedStatus = "completed";
          } else if (
            statusText.includes("in_progress") ||
            statusText.includes("progress") ||
            statusText === "IN_PROGRESS" ||
            statusText === "in_progress"
          ) {
            normalizedStatus = "in_progress";
          } else if (
            statusText.includes("blocked") ||
            statusText.includes("failed") ||
            statusText.includes("error") ||
            statusText === "BLOCKED" ||
            statusText === "blocked"
          ) {
            normalizedStatus = "blocked";
          } else if (
            statusText.includes("planning") ||
            statusText.includes("pending") ||
            statusText === "PLANNING" ||
            statusText === "planning"
          ) {
            normalizedStatus = "planning";
          }

          // Map emoji to status if present (but be more careful with completion)
          if (emoji === "❌" || emoji === "🚫") {
            normalizedStatus = "blocked";
          } else if (emoji === "⏳" || emoji === "🔄") {
            normalizedStatus = "in_progress";
          } else if (emoji === "✅" || emoji === "🎉") {
            // Only set to completed if we're sure it's 100% done
            // This will be overridden later if progress < 100%
            normalizedStatus = "completed";
          }

          progressInfo.status = normalizedStatus;
          logger.debug(
            `📊 [ManualTasksImportService] Status detected: ${emoji} ${statusText} -> ${normalizedStatus}`,
          );
          statusDetected = true;
          break;
        }
      }

      // Extract created date
      const createdMatch = content.match(/Created.*?(\d{4}-\d{2}-\d{2})/);
      if (createdMatch) {
        progressInfo.createdDate = createdMatch[1];
      }

      // Extract last updated date
      const lastUpdatedMatch = content.match(
        /Last Updated.*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z|\d{4}-\d{2}-\d{2})/,
      );
      if (lastUpdatedMatch) {
        progressInfo.lastUpdatedDate = lastUpdatedMatch[1];
      }

      // Extract completion date
      const completionDateMatch = content.match(
        /Completion Date.*?(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z|\d{4}-\d{2}-\d{2})/,
      );
      if (completionDateMatch) {
        progressInfo.completionDate = completionDateMatch[1];
      }

      // Extract estimated completion
      const completionMatch = content.match(
        /Estimated Completion.*?(\d{4}-\d{2}-\d{2})/,
      );
      if (completionMatch) {
        progressInfo.estimatedCompletion = completionMatch[1];
      }

      // Extract time tracking
      const timeMatch = content.match(/Actual Time.*?(\d+) hours/);
      if (timeMatch) {
        progressInfo.actualTime = parseInt(timeMatch[1]);
      }

      // Extract phase breakdown with improved phase name detection
      const phaseMatches = content.matchAll(
        /\| (\d+[A-Z]?) \|.*?\| (🟢|🟡|🔴|✅) /g,
      );
      const phases = [];
      for (const match of phaseMatches) {
        const phaseNumber = match[1];
        const phaseStatus =
          match[2] === "🟢"
            ? "planning"
            : match[2] === "🟡"
              ? "in_progress"
              : match[2] === "🔴"
                ? "blocked"
                : "completed";

        // Try to extract phase name from content
        const phaseName = this.extractPhaseName(content, phaseNumber);

        phases.push({
          phase: phaseName || phaseNumber, // Use extracted name or fallback to number
          status: phaseStatus,
          number: phaseNumber,
        });
      }
      progressInfo.phases = phases;

      // ✅ NEW: Check if feature is actually implemented
      const implementationStatus = this._checkImplementationStatus(content);
      if (implementationStatus.isImplemented) {
        progressInfo.status = "completed";
        progressInfo.overallProgress = 100;
        progressInfo.implementationVerified = true;
        progressInfo.implementationFiles = implementationStatus.files;
        logger.debug(
          `✅ Feature implementation detected: ${implementationStatus.files.length} files found`,
        );
      }

      // ✅ NEW: Additional completion detection patterns (only for 100% completion)
      const completionPatterns = [
        /100%\s*(Complete|COMPLETED|complete)/gi,
        /Overall Progress.*?100%/gi,
        /Progress.*?100%/gi,
        /TASK COMPLETED SUCCESSFULLY/gi,
        /Task Completed Successfully/gi,
        /COMPLETED SUCCESSFULLY/gi,
      ];

      for (const pattern of completionPatterns) {
        if (pattern.test(content)) {
          progressInfo.status = "completed";
          progressInfo.overallProgress = 100;
          logger.debug(
            `✅ 100% Completion pattern detected: ${pattern.source}`,
          );
          break;
        }
      }

      // ✅ NEW: Partial completion detection (don't override calculated progress)
      const partialCompletionPatterns = [
        /✅\s*(Complete|COMPLETED|complete|Done|done|Finished|finished)/gi,
        /🎉\s*(Complete|COMPLETED|complete|Done|done|Finished|finished)/gi,
      ];

      let hasPartialCompletion = false;
      for (const pattern of partialCompletionPatterns) {
        if (pattern.test(content)) {
          hasPartialCompletion = true;
          logger.debug(
            `✅ Partial completion pattern detected: ${pattern.source}`,
          );
          break;
        }
      }

      // 🧠 INTELLIGENT STATUS DETECTION: Determine status based on critical vs optional phases
      const intelligentStatus = this.determineIntelligentStatus(
        progressInfo.phases,
        progressInfo.overallProgress,
      );
      if (intelligentStatus) {
        progressInfo.status = intelligentStatus;
        logger.debug(
          `🧠 Intelligent status detection: ${intelligentStatus} (based on critical phases analysis)`,
        );
      }

      // Only set status to completed if progress is actually 100%
      // If we have partial completion but progress < 100%, keep it as in_progress
      if (
        hasPartialCompletion &&
        progressInfo.overallProgress < 100 &&
        !intelligentStatus
      ) {
        progressInfo.status = "in_progress";
        logger.debug(
          `🔄 Partial completion detected but progress is ${progressInfo.overallProgress}% - setting status to in_progress`,
        );
      }

      // ✅ FINAL VALIDATION: Ensure status matches progress (but respect intelligent detection)
      if (progressInfo.overallProgress >= 100) {
        progressInfo.status = "completed";
        logger.debug(`✅ Progress is 100% - final status set to completed`);
      } else if (
        progressInfo.overallProgress > 0 &&
        progressInfo.overallProgress < 100
      ) {
        // Only override if intelligent detection didn't set it to completed
        if (progressInfo.status === "completed" && !intelligentStatus) {
          progressInfo.status = "in_progress";
          logger.debug(
            `🔄 Progress is ${progressInfo.overallProgress}% but status was completed - corrected to in_progress`,
          );
        } else if (intelligentStatus === "completed") {
          logger.debug(
            `🧠 Keeping intelligent status 'completed' despite ${progressInfo.overallProgress}% progress`,
          );
        }
      } else if (progressInfo.overallProgress === 0) {
        if (progressInfo.status === "completed" && !intelligentStatus) {
          progressInfo.status = "planning";
          logger.debug(
            `🔄 Progress is 0% but status was completed - corrected to planning`,
          );
        }
      }

      return progressInfo;
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Error parsing index file:`,
        error,
      );
      return {};
    }
  }

  /**
   * Calculate progress percentage based on phase completion
   */
  _calculateProgressFromPhases(content) {
    try {
      let completedPhases = 0;
      let totalPhases = 0;

      // Pattern 1: Phase status patterns like "✅ Complete", "⏳ Pending", etc.
      const phasePatterns = [
        /(?:Phase \d+|Phase \d+ of \d+).*?(✅|❌|⏳|🔄|🚫|🎉)?\s*(Complete|Pending|In Progress|Blocked|Planning|COMPLETED|IN_PROGRESS)/gi,
        /Phase.*?(✅|❌|⏳|🔄|🚫|🎉)?\s*(Complete|Pending|In Progress|Blocked|Planning|COMPLETED|IN_PROGRESS)/gi,
      ];

      for (const pattern of phasePatterns) {
        const phaseMatches = content.matchAll(pattern);
        for (const match of phaseMatches) {
          totalPhases++;
          const emoji = match[1] || "";
          const status = (match[2] || "").toLowerCase();

          // Count as completed if ✅ or contains "complete"
          if (
            emoji === "✅" ||
            emoji === "🎉" ||
            status.includes("complete") ||
            status.includes("done") ||
            status.includes("finished")
          ) {
            completedPhases++;
          }
        }
      }

      // Pattern 2: Individual phase status in tables
      const tablePatterns = [
        /\| (\d+[A-Z]?) \|.*?\| (🟢|🟡|🔴|✅|🎉) /g,
        /\| (\d+[A-Z]?) \|.*?\| (✅|COMPLETED|Complete|complete) /gi,
        /\| (\d+[A-Z]?) \|.*?\| (🔄|IN_PROGRESS|In Progress|in_progress) /gi,
      ];

      for (const pattern of tablePatterns) {
        const tablePhaseMatches = content.matchAll(pattern);
        for (const match of tablePhaseMatches) {
          totalPhases++;
          const status = match[2];
          if (
            status === "✅" ||
            status === "🎉" ||
            status === "🟢" ||
            status.toLowerCase().includes("complete") ||
            status.toLowerCase().includes("done") ||
            status.toLowerCase().includes("finished")
          ) {
            completedPhases++;
          }
        }
      }

      // Pattern 3: Check for "✅ COMPLETED" patterns in phase descriptions
      const completedPhaseMatches = content.matchAll(
        /✅\s*(COMPLETED|Complete|complete|Done|done|Finished|finished)/gi,
      );
      for (const match of completedPhaseMatches) {
        totalPhases++;
        completedPhases++;
      }

      if (totalPhases > 0) {
        const calculatedProgress = Math.round(
          (completedPhases / totalPhases) * 100,
        );
        logger.debug(
          `📊 [ManualTasksImportService] Progress calculated: ${completedPhases}/${totalPhases} phases = ${calculatedProgress}%`,
        );
        return calculatedProgress;
      }

      return 0;
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Error calculating progress from phases:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Check if feature is actually implemented by looking for implementation files
   */
  _checkImplementationStatus(content) {
    try {
      const fs = require("fs");
      const path = require("path");

      // Check if this is the task panel completion filter feature
      if (
        content.includes("task panel completion filter") ||
        content.includes("Task Panel Completion Filter")
      ) {
        const workspacePath = process.cwd();
        const requiredFiles = [
          "frontend/src/utils/taskCompletionUtils.js",
          "frontend/src/components/TaskCompletionBadge.jsx",
          "frontend/tests/unit/TaskCompletionUtils.test.js",
          "frontend/tests/unit/TaskCompletionBadge.test.jsx",
          "frontend/tests/integration/TasksPanelCompletionFilter.test.jsx",
        ];

        const existingFiles = [];
        for (const file of requiredFiles) {
          try {
            const filePath = path.join(workspacePath, file);
            if (fs.existsSync(filePath)) {
              existingFiles.push(file);
            }
          } catch (error) {
            // File doesn't exist
          }
        }

        const isImplemented = existingFiles.length >= 4; // At least 4 out of 5 files

        return {
          isImplemented,
          files: existingFiles,
          feature: "task-panel-completion-filter",
        };
      }

      // Add more feature checks here as needed
      return { isImplemented: false, files: [], feature: "unknown" };
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Error checking implementation status:`,
        error,
      );
      return { isImplemented: false, files: [], feature: "error" };
    }
  }

  /**
   * Update Index File mit neuem Progress
   */
  async updateIndexFileProgress(projectId, featureId, progressData) {
    try {
      logger.info(
        `🔄 [ManualTasksImportService] Updating index file progress for feature ${featureId}`,
      );

      // Finde das Index File für dieses Feature
      const indexTask = await this.taskRepository.findByMetadata({
        featureId,
        isIndexTask: true,
      });

      if (!indexTask) {
        logger.warn(
          `⚠️ [ManualTasksImportService] No index file found for feature ${featureId}`,
        );
        return false;
      }

      // Update Progress-Informationen in den Metadaten
      const updatedMetadata = {
        ...indexTask.metadata,
        ...progressData,
        lastUpdated: new Date(),
      };

      // Update Task in der Datenbank
      await this.taskRepository.updateTask(indexTask.id, {
        metadata: updatedMetadata,
      });

      logger.info(
        `✅ [ManualTasksImportService] Index file progress updated for feature ${featureId}`,
      );
      return true;
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Error updating index file progress:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get Progress für ein Feature aus dem Index File
   */
  async getFeatureProgress(projectId, featureId) {
    try {
      const indexTask = await this.taskRepository.findByMetadata({
        featureId,
        isIndexTask: true,
      });

      if (!indexTask) {
        return null;
      }

      return {
        overallProgress: indexTask.metadata.overallProgress || 0,
        currentPhase: indexTask.metadata.currentPhase || 1,
        status: indexTask.metadata.status || "planning",
        estimatedCompletion: indexTask.metadata.estimatedCompletion,
        actualTime: indexTask.metadata.actualTime || 0,
        phases: indexTask.metadata.phases || [],
      };
    } catch (error) {
      logger.error(
        `❌ [ManualTasksImportService] Error getting feature progress:`,
        error,
      );
      return null;
    }
  }

  /**
   * Extract detailed task information from markdown content
   * @param {string} content - Markdown content
   * @param {string} filename - Source filename
   * @returns {Object} Extracted task details
   */
  extractTaskDetailsFromMarkdown(content, filename) {
    try {
      const lines = content.split("\n");
      let description = "";
      let steps = [];
      let requirements = [];
      let acceptanceCriteria = [];
      let currentSection = "";
      let metadata = {};

      // Extract sections from markdown
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Detect section headers
        if (line.startsWith("## ")) {
          currentSection = line.replace("## ", "").toLowerCase();
          continue;
        }

        // Extract description (first paragraph or overview section)
        if (
          currentSection === "overview" ||
          (!currentSection &&
            line &&
            !line.startsWith("#") &&
            !line.startsWith("-") &&
            !line.startsWith("*"))
        ) {
          if (description === "") {
            description = line;
          } else if (description.length < 200) {
            description += " " + line;
          }
        }

        // Extract steps
        if (
          currentSection.includes("step") ||
          currentSection.includes("phase") ||
          currentSection.includes("implementation")
        ) {
          if (
            line.startsWith("- ") ||
            line.startsWith("* ") ||
            line.startsWith("1. ")
          ) {
            steps.push(line.replace(/^[-*]\s*|\d+\.\s*/, ""));
          }
        }

        // Extract requirements
        if (
          currentSection.includes("requirement") ||
          currentSection.includes("specification")
        ) {
          if (line.startsWith("- ") || line.startsWith("* ")) {
            requirements.push(line.replace(/^[-*]\s*/, ""));
          }
        }

        // Extract acceptance criteria
        if (
          currentSection.includes("acceptance") ||
          currentSection.includes("criteria") ||
          currentSection.includes("definition")
        ) {
          if (line.startsWith("- ") || line.startsWith("* ")) {
            acceptanceCriteria.push(line.replace(/^[-*]\s*/, ""));
          }
        }

        // Extract metadata
        if (line.startsWith("- **") && line.includes("**:")) {
          const match = line.match(/- \*\*([^*]+)\*\*: (.+)/);
          if (match) {
            const key = match[1].toLowerCase().replace(/\s+/g, "_");
            metadata[key] = match[2];
          }
        }
      }

      // Clean up description
      description = description.replace(/\s+/g, " ").trim();
      if (description.length > 500) {
        description = description.substring(0, 500) + "...";
      }

      // If no description found, try to extract from title or first meaningful line
      if (!description) {
        const firstMeaningfulLine = lines.find(
          (line) =>
            line.trim() &&
            !line.startsWith("#") &&
            !line.startsWith("-") &&
            !line.startsWith("*") &&
            line.length > 10,
        );
        if (firstMeaningfulLine) {
          description = firstMeaningfulLine.trim();
        }
      }

      logger.debug(`📝 Extracted task details from ${filename}:`, {
        description: description.substring(0, 100) + "...",
        stepsCount: steps.length,
        requirementsCount: requirements.length,
        acceptanceCriteriaCount: acceptanceCriteria.length,
        metadataKeys: Object.keys(metadata),
      });

      return {
        description,
        metadata: {
          ...metadata,
          steps: steps,
          requirements: requirements,
          acceptanceCriteria: acceptanceCriteria,
          extractedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      logger.error(
        `❌ Failed to extract task details from ${filename}:`,
        error.message,
      );
      return {
        description: `Manual task imported from ${filename}`,
        metadata: {
          extractionError: error.message,
          extractedAt: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Generate new status-based path structure
   * @param {string} status - Task status (pending, in_progress, completed, etc.)
   * @param {string} priority - Task priority (high, medium, low, critical)
   * @param {string} category - Task category
   * @param {string} title - Task title
   * @returns {string} New status-based path
   */
  generateNewStatusBasedPath(status, priority, category, title) {
    try {
      // Convert title to task name (kebab-case)
      const taskName = title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // Generate path based on status
      if (status === "completed") {
        // For completed tasks, use quarter-based organization
        const quarter = this.getCurrentQuarter();
        return `docs/09_roadmap/completed/${quarter}/${category}/${taskName}/`;
      } else if (status === "in_progress") {
        return `docs/09_roadmap/in-progress/${priority}/${category}/${taskName}/`;
      } else if (status === "blocked") {
        return `docs/09_roadmap/blocked/${priority}/${category}/${taskName}/`;
      } else if (status === "cancelled") {
        return `docs/09_roadmap/cancelled/${priority}/${category}/${taskName}/`;
      } else {
        // Default to pending
        return `docs/09_roadmap/pending/${priority}/${category}/${taskName}/`;
      }
    } catch (error) {
      logger.error(
        `❌ Failed to generate new path for ${title}:`,
        error.message,
      );
      return `docs/09_roadmap/pending/medium/${category}/${title.toLowerCase().replace(/\s+/g, "-")}/`;
    }
  }

  /**
   * Get current quarter for completed tasks organization
   * @returns {string} Current quarter (e.g., '2024-q4')
   */
  getCurrentQuarter() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-based to 1-based

    let quarter;
    if (month <= 3) quarter = "q1";
    else if (month <= 6) quarter = "q2";
    else if (month <= 9) quarter = "q3";
    else quarter = "q4";

    return `${year}-${quarter}`;
  }

  /**
   * 🧠 INTELLIGENT STATUS DETECTION
   * Determine task status based on critical vs optional phases
   * @param {Array} phases - Array of phase objects
   * @param {number} overallProgress - Overall progress percentage
   * @returns {string|null} Intelligent status or null if no override needed
   */
  determineIntelligentStatus(phases, overallProgress) {
    if (!phases || phases.length === 0) {
      return null; // No phases to analyze
    }

    // Categorize phases into critical and optional
    const criticalPhases = phases.filter((phase) =>
      this.isCriticalPhase(phase),
    );
    const optionalPhases = phases.filter(
      (phase) => !this.isCriticalPhase(phase),
    );

    logger.debug(
      `🧠 Phase analysis: ${criticalPhases.length} critical, ${optionalPhases.length} optional phases`,
    );

    // Count completed phases
    const criticalCompleted = criticalPhases.filter(
      (p) => p.status === "completed",
    ).length;
    const criticalTotal = criticalPhases.length;
    const optionalCompleted = optionalPhases.filter(
      (p) => p.status === "completed",
    ).length;
    const optionalTotal = optionalPhases.length;

    logger.debug(
      `🧠 Critical phases: ${criticalCompleted}/${criticalTotal} completed`,
    );
    logger.debug(
      `🧠 Optional phases: ${optionalCompleted}/${optionalTotal} completed`,
    );

    // Rule 1: All critical phases completed = COMPLETED (regardless of optional phases)
    if (criticalTotal > 0 && criticalCompleted === criticalTotal) {
      logger.debug(`🧠 All critical phases completed - marking as COMPLETED`);
      return "completed";
    }

    // Rule 2: At least one critical phase in progress = IN_PROGRESS
    if (criticalPhases.some((p) => p.status === "in_progress")) {
      logger.debug(`🧠 Critical phases in progress - marking as IN_PROGRESS`);
      return "in_progress";
    }

    // Rule 3: Only optional phases remaining = COMPLETED (with note)
    if (
      criticalTotal > 0 &&
      criticalCompleted === criticalTotal &&
      optionalTotal > 0
    ) {
      logger.debug(`🧠 Only optional phases remaining - marking as COMPLETED`);
      return "completed";
    }

    // Rule 4: No critical phases, only optional = use progress-based logic
    if (criticalTotal === 0 && optionalTotal > 0) {
      logger.debug(`🧠 No critical phases, using progress-based logic`);
      return overallProgress >= 100 ? "completed" : "in_progress";
    }

    // Rule 5: Fallback to original logic
    logger.debug(`🧠 Using fallback logic`);
    return null;
  }

  /**
   * Determine if a phase is critical (core functionality) or optional (nice-to-have)
   * @param {Object} phase - Phase object with name and status
   * @returns {boolean} True if phase is critical
   */
  isCriticalPhase(phase) {
    if (!phase || !phase.phase) {
      return false;
    }

    const phaseName = phase.phase.toLowerCase();

    // Critical phase keywords (core functionality)
    const criticalKeywords = [
      "critical",
      "core",
      "essential",
      "main",
      "primary",
      "bug-fix",
      "bugfix",
      "implementation",
      "feature",
      "data-flow",
      "dataflow",
      "fix",
      "repair",
      "resolve",
      "authentication",
      "security",
      "database",
      "api",
      "endpoint",
      "controller",
      "service",
      "handler",
      "validation", // Data flow validation is critical
    ];

    // Optional phase keywords (nice-to-have) - more specific
    const optionalKeywords = [
      "testing",
      "test",
      "documentation",
      "docs",
      "polish",
      "optimization",
      "performance",
      "ui",
      "ux",
      "refactor",
      "cleanup",
      "review",
      "analysis",
      "unit-test",
      "integration-test",
      "e2e-test",
    ];

    // Check for optional keywords first (more specific)
    const isOptional = optionalKeywords.some((keyword) =>
      phaseName.includes(keyword),
    );

    if (isOptional) {
      return false;
    }

    // Check for critical keywords
    const isCritical = criticalKeywords.some((keyword) =>
      phaseName.includes(keyword),
    );

    return isCritical;
  }

  /**
   * Extract phase name from content based on phase number
   * @param {string} content - File content
   * @param {string} phaseNumber - Phase number (e.g., "1", "2", "3")
   * @returns {string|null} Extracted phase name or null
   */
  extractPhaseName(content, phaseNumber) {
    // Look for phase links in markdown table format: | 1 | [Critical Bug Fixes](./git-steps-fix-phase-1.md) |
    const tableRowPattern = new RegExp(
      `\\|\\s*${phaseNumber}\\s*\\|\\s*\\[([^\\]]+)\\]\\([^)]*phase-${phaseNumber}[^)]*\\)`,
      "i",
    );
    const tableRowMatch = content.match(tableRowPattern);

    if (tableRowMatch) {
      return tableRowMatch[1].trim();
    }

    // Look for phase links like [Phase 1](./git-steps-fix-phase-1.md)
    const phaseLinkPattern = new RegExp(
      `\\[Phase ${phaseNumber}[^\\]]*\\]\\([^)]*phase-${phaseNumber}[^)]*\\)`,
      "i",
    );
    const phaseLinkMatch = content.match(phaseLinkPattern);

    if (phaseLinkMatch) {
      // Extract the text between [ and ]
      const linkText = phaseLinkMatch[0];
      const nameMatch = linkText.match(/\[([^\]]+)\]/);
      if (nameMatch) {
        return nameMatch[1].replace(`Phase ${phaseNumber}`, "").trim();
      }
    }

    // Look for phase descriptions in the content
    const phaseDescPattern = new RegExp(
      `Phase ${phaseNumber}[^\\n]*:?\\s*([^\\n]+)`,
      "i",
    );
    const phaseDescMatch = content.match(phaseDescPattern);

    if (phaseDescMatch) {
      return phaseDescMatch[1].trim();
    }

    return null;
  }
}

module.exports = ManualTasksImportService;
