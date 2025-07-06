const fs = require('fs').promises;
const path = require('path');
const { marked } = require('marked');

/**
 * Handler for managing documentation tasks from markdown files
 * Provides secure access to task documentation in docs/09_roadmap/features/
 */
class DocsTasksHandler {
  constructor(getWorkspacePath) {
    // getWorkspacePath: function that returns the current workspace root path
    this.getWorkspacePath = getWorkspacePath || (() => process.cwd());
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
   * Get list of all available documentation tasks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDocsTasks(req, res) {
    try {
      const featuresDir = this.getFeaturesDir();
      console.log('[DocsTasksHandler] Getting docs tasks list from:', featuresDir);
      
      // Check if directory exists
      try {
        await fs.access(featuresDir);
      } catch (error) {
        console.error('[DocsTasksHandler] Features directory not found:', featuresDir);
        return res.status(404).json({
          success: false,
          error: 'Documentation directory not found'
        });
      }

      // Read directory contents
      const files = await fs.readdir(featuresDir);
      
      // Filter markdown files and extract metadata
      const tasks = [];
      for (const file of files) {
        if (this.isValidMarkdownFile(file)) {
          try {
            const filePath = path.join(featuresDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const metadata = this.extractTaskMetadata(content, file);
            
            tasks.push({
              id: path.parse(file).name,
              filename: file,
              title: metadata.title,
              priority: metadata.priority,
              estimatedTime: metadata.estimatedTime,
              status: metadata.status,
              lastModified: (await fs.stat(filePath)).mtime.toISOString()
            });
          } catch (error) {
            console.error(`[DocsTasksHandler] Error reading file ${file}:`, error);
            // Continue with other files
          }
        }
      }

      // Sort by priority and title
      tasks.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 0;
        const bPriority = priorityOrder[b.priority] || 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        return a.title.localeCompare(b.title);
      });

      console.log(`[DocsTasksHandler] Found ${tasks.length} documentation tasks`);
      
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
   * Get specific documentation task content
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDocsTaskDetails(req, res) {
    try {
      const { filename } = req.params;
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Filename parameter is required'
        });
      }

      const featuresDir = this.getFeaturesDir();
      console.log(`[DocsTasksHandler] Getting details for file: ${filename}`);
      console.log(`[DocsTasksHandler] Features directory: ${featuresDir}`);

      // Validate filename to prevent path traversal
      const safeFilename = this.validateFilename(filename);
      if (!safeFilename) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filename'
        });
      }

      const filePath = path.join(featuresDir, safeFilename);
      
      // Check if it's a valid markdown file first
      if (!this.isValidMarkdownFile(safeFilename)) {
        return res.status(400).json({
          success: false,
          error: 'Only markdown files are allowed'
        });
      }

      // Check if file exists and is accessible
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.status(404).json({
          success: false,
          error: 'Documentation file not found'
        });
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      const metadata = this.extractTaskMetadata(content, safeFilename);
      const htmlContent = this.convertMarkdownToHtml(content);

      const taskDetails = {
        id: path.parse(safeFilename).name,
        filename: safeFilename,
        title: metadata.title,
        priority: metadata.priority,
        estimatedTime: metadata.estimatedTime,
        status: metadata.status,
        content: content,
        htmlContent: htmlContent,
        metadata: metadata,
        lastModified: (await fs.stat(filePath)).mtime.toISOString()
      };

      console.log(`[DocsTasksHandler] Successfully retrieved details for: ${safeFilename}`);
      
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
}

module.exports = DocsTasksHandler; 