const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Mock marked for Jest compatibility
let marked;
try {
  const markedModule = require('marked');
  marked = markedModule.marked || markedModule;
} catch (error) {
  // Fallback for Jest environment
  marked = (text) => text;
}
const crypto = require('crypto');
const Task = require('@entities/Task');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

/**
 * Handler for managing manual tasks from markdown files
 * Provides secure access to task documentation in docs/09_roadmap/tasks/
 */
class ManualTasksHandler {
  constructor(getWorkspacePath, taskRepository = null) {
    // getWorkspacePath: function that returns the current workspace root path
    this.getWorkspacePath = getWorkspacePath || (() => process.cwd());
    this.taskRepository = taskRepository;
    this.allowedExtensions = ['.md', '.markdown'];
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  getFeaturesDir() {
    // Always resolve from the current workspace root
    const workspaceRoot = this.getWorkspacePath();
    
    if (!workspaceRoot) {
      logger.error('Workspace path is undefined');
      throw new Error('Workspace path is not available');
    }
    
    logger.info(`Workspace root: ${workspaceRoot}`);
    // ✅ FIXED: Use new status-based structure instead of old tasks structure
    const featuresDir = path.resolve(workspaceRoot, 'docs/09_roadmap');
    logger.info(`Features directory resolved: ${featuresDir}`);
    
    return featuresDir;
  }

  /**
   * Get list of all available manual tasks from database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getManualTasks(req, res) {
    try {
      const projectId = req.params.projectId || req.query.projectId;
      
      if (!this.taskRepository) {
        return res.status(500).json({
          success: false,
          error: 'Task repository not available'
        });
      }

      // Get tasks from database (already imported by TaskController)
      const tasks = await this.taskRepository.findByProject(projectId);
      
      // Return ALL tasks - no filtering
      const manualTasks = tasks;

      // Sort by category, priority, and title
      tasks.sort((a, b) => {
        // First sort by category
        const aCategory = a.category;
        const bCategory = b.category;
        
        if (aCategory !== bCategory) {
          return aCategory.localeCompare(bCategory);
        }
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // Finally by title
        return a.title.localeCompare(b.title);
      });

      logger.info(`Found ${tasks.length} manual tasks from database`);
      
      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      logger.error('Error getting manual tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve manual tasks'
      });
    }
  }

  /**
   * Get specific manual task content from database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getManualTaskDetails(req, res) {
    try {
      const { taskId } = req.params;
      const projectId = req.params.projectId || req.query.projectId;
      
      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'Task ID parameter is required'
        });
      }

      if (!this.taskRepository) {
        return res.status(500).json({
          success: false,
          error: 'Task repository not available'
        });
      }

      // Get task from database
      const task = await this.taskRepository.findById(taskId);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      // Parse metadata to extract content and details
      let parsedMetadata = {};
      try {
        parsedMetadata = JSON.parse(task.metadata || '{}');
      } catch (error) {
        logger.warn('Failed to parse task metadata:', error.message);
      }

      // Convert markdown content to HTML
      const content = parsedMetadata.content || task.description || '';
      const htmlContent = this.convertMarkdownToHtml(content);

      const taskDetails = {
        id: task.id,
        title: task.title,
        priority: task.priority,
        category: task.category,
        type: task.type,
        status: task.status,
        content: content,
        htmlContent: htmlContent,
        metadata: task.metadata,
        // ✅ FIXED: Add new status-based path structure
        filePath: parsedMetadata.newPath || parsedMetadata.sourcePath || this.generateStatusBasedPath(task),
        sourceFile: parsedMetadata.sourceFile,
        sourcePath: parsedMetadata.sourcePath,
        steps: parsedMetadata.steps || [],
        requirements: parsedMetadata.requirements || [],
        acceptanceCriteria: parsedMetadata.acceptanceCriteria || [],
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };

      logger.info(`Successfully retrieved task details for: ${task.title}`);
      
      res.json({
        success: true,
        data: taskDetails
      });
    } catch (error) {
      logger.error('Error getting task details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve task details'
      });
    }
  }

  /**
   * Validate filename to prevent path traversal attacks
   * @param {string} filename - The filename to validate
   * @returns {string|null} - Safe filename or null if invalid
   */
  validateFilename(filename) {
    // Normalize path to prevent path traversal
    const normalizedPath = path.normalize(filename);
    
    // Check for path traversal attempts
    if (normalizedPath.includes('..') || normalizedPath.startsWith('/') || normalizedPath.startsWith('\\')) {
      logger.warn(`Path traversal attempt detected: ${filename}`);
      return null;
    }
    
    // Only allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9._-]+$/.test(normalizedPath)) {
      logger.warn(`Invalid filename characters: ${filename}`);
      return null;
    }
    
    return normalizedPath;
  }

  /**
   * Check if file is a valid markdown file
   * @param {string} filename - The filename to check
   * @returns {boolean} - True if valid markdown file
   */
  isValidMarkdownFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.allowedExtensions.includes(ext);
  }

  /**
   * Extract metadata from markdown content
   * @param {string} content - Markdown content
   * @param {string} filename - Filename for fallback title
   * @returns {Object} - Extracted metadata
   */
  extractTaskMetadata(content, filename) {
    const lines = content.split('\n');
    const metadata = {
      title: path.parse(filename).name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      priority: 'medium',
      estimatedTime: null,
      status: 'pending'
    };

    // Extract title from first heading
    for (const line of lines) {
      if (line.startsWith('# ')) {
        metadata.title = line.substring(2).trim();
        break;
      }
    }

    // Extract priority from content
    const priorityMatch = content.match(/priority[:\s]+(high|medium|low)/i);
    if (priorityMatch) {
      metadata.priority = priorityMatch[1].toLowerCase();
    }

    // Extract estimated time
    const timeMatch = content.match(/estimated[:\s]+time[:\s]+([^\n]+)/i);
    if (timeMatch) {
      metadata.estimatedTime = timeMatch[1].trim();
    }

    // Extract status
    const statusMatch = content.match(/status[:\s]+(pending|in-progress|completed|blocked)/i);
    if (statusMatch) {
      metadata.status = statusMatch[1].toLowerCase();
    }

    return metadata;
  }

  /**
   * Convert markdown content to HTML
   * @param {string} markdown - Markdown content
   * @returns {string} - HTML content
   */
  convertMarkdownToHtml(markdown) {
    try {
      // Configure marked for security
      marked.setOptions({
        breaks: true,
        gfm: true,
        sanitize: false, // We trust our content
        smartLists: true
      });

      return marked(markdown);
    } catch (error) {
      logger.error('Error converting markdown to HTML:', error);
      return `<p>Error rendering markdown: ${error.message}</p>`;
    }
  }

  /**
   * Get cached data or fetch fresh data
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch fresh data
   * @returns {Promise<*>} - Cached or fresh data
   */
  async getCachedData(key, fetchFunction) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Sync manual tasks to repository (now handled by TaskController)
   */
  async syncManualTasksToRepository() {
    logger.info('Sync is now handled by TaskController - skipping');
    return;
  }

  _findAllMarkdownFiles(dir) {
    const files = [];
    this._walk(dir, files);
    return files;
  }

  _walk(dir, files) {
    if (!fsSync.existsSync(dir)) return;
    for (const entry of fsSync.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      if (fsSync.statSync(fullPath).isDirectory()) {
        this._walk(fullPath, files);
      } else if (fullPath.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  _generateId(filePath, content) {
    return crypto.createHash('sha1').update(filePath + this._hashContent(content)).digest('hex');
  }

  _hashContent(content) {
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  _extractTitle(content, filePath) {
    const match = content.match(/^#\s+(.+)/m);
    if (match) return match[1].trim();
    return path.basename(filePath, '.md');
  }

  /**
   * Generate new status-based path structure
   * @param {Object} task - Task object
   * @returns {string} New status-based path
   */
  generateStatusBasedPath(task) {
    try {
      const status = task.status?.value || task.status || 'pending';
      const priority = task.priority?.value || task.priority || 'medium';
      const category = task.category || 'general';
      
      // Convert title to task name (kebab-case)
      const taskName = task.title.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Generate path based on status
      if (status === 'completed') {
        // For completed tasks, use quarter-based organization
        const quarter = this.getCurrentQuarter();
        return `docs/09_roadmap/completed/${quarter}/${category}/${taskName}/`;
      } else if (status === 'in-progress') {
        return `docs/09_roadmap/in-progress/${priority}/${category}/${taskName}/`;
      } else if (status === 'blocked') {
        return `docs/09_roadmap/blocked/${priority}/${category}/${taskName}/`;
      } else if (status === 'cancelled') {
        return `docs/09_roadmap/cancelled/${priority}/${category}/${taskName}/`;
      } else {
        // Default to pending
        return `docs/09_roadmap/pending/${priority}/${category}/${taskName}/`;
      }
    } catch (error) {
      logger.error(`❌ Failed to generate new path for ${task.title}:`, error.message);
      return `docs/09_roadmap/pending/medium/${task.category || 'general'}/${task.title?.toLowerCase().replace(/\s+/g, '-')}/`;
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
    if (month <= 3) quarter = 'q1';
    else if (month <= 6) quarter = 'q2';
    else if (month <= 9) quarter = 'q3';
    else quarter = 'q4';
    
    return `${year}-${quarter}`;
  }
}

module.exports = ManualTasksHandler; 