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

/**
 * Handler for managing documentation tasks from markdown files
 * Provides secure access to task documentation in docs/09_roadmap/features/
 */
class DocsTasksHandler {
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
      console.error('[DocsTasksHandler] Workspace path is undefined');
      throw new Error('Workspace path is not available');
    }
    
    console.log(`[DocsTasksHandler] Workspace root: ${workspaceRoot}`);
    const featuresDir = path.resolve(workspaceRoot, 'docs/09_roadmap/features');
    console.log(`[DocsTasksHandler] Features directory resolved: ${featuresDir}`);
    
    return featuresDir;
  }

  /**
   * Get list of all available documentation tasks from database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDocsTasks(req, res) {
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
      const docsTasks = tasks;

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

      console.log(`[DocsTasksHandler] Found ${tasks.length} documentation tasks from database`);
      
      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('[DocsTasksHandler] Error getting docs tasks:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve documentation tasks'
      });
    }
  }

  /**
   * Get specific documentation task content from database
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDocsTaskDetails(req, res) {
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

      // Convert markdown content to HTML
      const htmlContent = this.convertMarkdownToHtml(task.description || '');

      const taskDetails = {
        id: task.id,
        title: task.title,
        priority: task.priority,
        category: task.category,
        type: task.type,
        status: task.status,
        content: task.description,
        htmlContent: htmlContent,
        metadata: task.metadata,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      };

      console.log(`[DocsTasksHandler] Successfully retrieved task details for: ${task.title}`);
      
      res.json({
        success: true,
        data: taskDetails
      });
    } catch (error) {
      console.error('[DocsTasksHandler] Error getting task details:', error);
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
      console.warn(`[DocsTasksHandler] Path traversal attempt detected: ${filename}`);
      return null;
    }
    
    // Only allow alphanumeric, hyphens, underscores, and dots
    if (!/^[a-zA-Z0-9._-]+$/.test(normalizedPath)) {
      console.warn(`[DocsTasksHandler] Invalid filename characters: ${filename}`);
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
      console.error('[DocsTasksHandler] Error converting markdown to HTML:', error);
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
    console.log('[DocsTasksHandler] Cache cleared');
  }

  /**
   * Sync documentation tasks to repository (now handled by TaskController)
   */
  async syncDocsTasksToRepository() {
    console.log('[DocsTasksHandler] Sync is now handled by TaskController - skipping');
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
}

module.exports = DocsTasksHandler; 