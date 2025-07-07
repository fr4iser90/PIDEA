/**
 * ProjectContextService - Centralized project context management
 * Provides consistent access to project path, ID, and workspace information
 */
const path = require('path');
const fs = require('fs').promises;
const { getServiceContainer } = require('./ServiceContainer');

class ProjectContextService {
    constructor() {
        this.container = getServiceContainer();
        this.projectMappingService = null;
        this.workspacePathDetector = null;
    }

    /**
     * Initialize project context service
     * @param {Object} dependencies - Service dependencies
     */
    initialize(dependencies = {}) {
        this.projectMappingService = dependencies.projectMappingService;
        this.workspacePathDetector = dependencies.workspacePathDetector;
    }

    /**
     * Set project context from various sources
     * @param {Object} context - Project context
     */
    setProjectContext(context) {
        const { projectPath, projectId, workspacePath } = context;
        
        // Validate and normalize project path
        if (projectPath) {
            const normalizedPath = this.normalizePath(projectPath);
            this.container.setProjectContext({ projectPath: normalizedPath });
        }

        // Set project ID
        if (projectId) {
            this.container.setProjectContext({ projectId });
        }

        // Set workspace path
        if (workspacePath) {
            const normalizedWorkspacePath = this.normalizePath(workspacePath);
            this.container.setProjectContext({ workspacePath: normalizedWorkspacePath });
        }

        // Auto-detect missing values
        this.autoDetectMissingContext();
    }

    /**
     * Get current project context
     * @returns {Object} Project context
     */
    getProjectContext() {
        return this.container.getProjectContext();
    }

    /**
     * Get project path (with fallback detection)
     * @returns {Promise<string|null>} Project path
     */
    async getProjectPath() {
        let projectPath = this.container.getProjectPath();
        
        if (!projectPath) {
            projectPath = await this.autoDetectProjectPath();
            if (projectPath) {
                this.container.setProjectContext({ projectPath });
            }
        }
        
        return projectPath;
    }

    /**
     * Get project ID (with fallback generation)
     * @returns {Promise<string>} Project ID
     */
    async getProjectId() {
        let projectId = this.container.getProjectId();
        
        if (!projectId) {
            const projectPath = this.container.getProjectPath();
            if (projectPath && this.projectMappingService) {
                projectId = await this.projectMappingService.getProjectIdFromWorkspace(projectPath);
                this.container.setProjectContext({ projectId });
            }
        }
        
        return projectId || 'default';
    }

    /**
     * Get workspace path (with fallback detection)
     * @returns {Promise<string|null>} Workspace path
     */
    async getWorkspacePath() {
        let workspacePath = this.container.getWorkspacePath();
        
        if (!workspacePath) {
            const projectPath = await this.getProjectPath();
            if (projectPath) {
                workspacePath = projectPath;
                this.container.setProjectContext({ workspacePath });
            }
        }
        
        return workspacePath;
    }

    /**
     * Auto-detect project path
     * @returns {Promise<string|null>} Project path or null
     */
    async autoDetectProjectPath() {
        try {
            const cwd = process.cwd();
            
            // Check if we're in a monorepo subdirectory (backend, frontend, etc.)
            const currentDirName = path.basename(cwd);
            const monorepoSubdirs = ['backend', 'frontend', 'client', 'server', 'api', 'app', 'web', 'mobile'];
            
            if (monorepoSubdirs.includes(currentDirName)) {
                // We're likely in a monorepo subdirectory, check parent
                const parentDir = path.dirname(cwd);
                const parentFiles = await fs.readdir(parentDir);
                
                // Check if parent has monorepo indicators
                const monorepoIndicators = [
                    'package.json', '.git', 'README.md', 'docker-compose.yml',
                    'lerna.json', 'nx.json', 'rush.json', 'pnpm-workspace.yaml'
                ];
                
                const hasMonorepoIndicators = monorepoIndicators.some(indicator => 
                    parentFiles.includes(indicator)
                );
                
                // Check if parent has multiple subdirectories that look like a monorepo
                const hasMultipleSubdirs = monorepoSubdirs.filter(subdir => 
                    parentFiles.includes(subdir)
                ).length >= 2;
                
                if (hasMonorepoIndicators && hasMultipleSubdirs) {
                    console.log('[ProjectContextService] Detected monorepo, using parent directory:', parentDir);
                    return parentDir;
                }
            }
            
            // Fallback to current directory if not a monorepo subdirectory
            const files = await fs.readdir(cwd);
            const projectIndicators = [
                'package.json', 'pyproject.toml', 'requirements.txt',
                'Cargo.toml', 'composer.json', 'pom.xml', 'build.gradle',
                '.git', 'README.md', 'src', 'app', 'lib'
            ];

            for (const indicator of projectIndicators) {
                if (files.includes(indicator)) {
                    return cwd;
                }
            }

            // Check parent directories as final fallback
            const parentDir = path.dirname(cwd);
            if (parentDir !== cwd) {
                const parentFiles = await fs.readdir(parentDir);
                for (const indicator of projectIndicators) {
                    if (parentFiles.includes(indicator)) {
                        return parentDir;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('[ProjectContextService] Auto-detect failed:', error.message);
            return null;
        }
    }

    /**
     * Extract project root from file path
     * @param {string} filePath - File path
     * @returns {string|null} Project root path
     */
    extractProjectRoot(filePath) {
        if (!filePath) return null;
        
        // Remove file:// protocol if present
        let path = filePath.replace(/^file:\/\//, '');
        
        // Remove filename at the end
        if (path.includes('/')) {
            const lastSlash = path.lastIndexOf('/');
            if (lastSlash > 0) {
                path = path.substring(0, lastSlash);
            }
        }
        
        // Search for typical project root indicators
        const pathParts = path.split('/');
        for (let i = pathParts.length - 1; i >= 0; i--) {
            const currentPath = '/' + pathParts.slice(0, i + 1).join('/');
            
            // Check if it's a project root
            if (this.isProjectRoot(currentPath)) {
                return currentPath;
            }
        }
        
        // Fallback: return path without filename
        return path;
    }

    /**
     * Check if path is a project root
     * @param {string} path - Path to check
     * @returns {boolean} True if project root
     */
    isProjectRoot(path) {
        const projectFiles = [
            'package.json', 'package-lock.json', 'yarn.lock',
            'Cargo.toml', 'Cargo.lock',
            'pyproject.toml', 'requirements.txt', 'setup.py',
            'composer.json', 'composer.lock',
            'Gemfile', 'Gemfile.lock',
            'go.mod', 'go.sum',
            'pom.xml', 'build.gradle',
            '.git', '.gitignore',
            'README.md', 'README.txt',
            'Makefile', 'CMakeLists.txt',
            'shell.nix', 'default.nix'
        ];
        
        // Check if any of these files exist in the path
        for (const file of projectFiles) {
            try {
                const fs = require('fs');
                const filePath = path + '/' + file;
                if (fs.existsSync(filePath)) {
                    return true;
                }
            } catch (error) {
                // Ignore filesystem access errors
            }
        }
        
        return false;
    }

    /**
     * Normalize path (resolve relative paths, handle different separators)
     * @param {string} path - Path to normalize
     * @returns {string} Normalized path
     */
    normalizePath(path) {
        if (!path) return null;
        
        // Resolve relative paths
        const resolvedPath = path.startsWith('/') ? path : path.resolve(path);
        
        // Normalize separators
        return resolvedPath.replace(/\\/g, '/');
    }

    /**
     * Auto-detect missing context values
     */
    async autoDetectMissingContext() {
        const context = this.container.getProjectContext();
        
        // Auto-detect project path if missing
        if (!context.projectPath) {
            const projectPath = await this.autoDetectProjectPath();
            if (projectPath) {
                this.container.setProjectContext({ projectPath });
            }
        }
        
        // Auto-detect workspace path if missing
        if (!context.workspacePath && context.projectPath) {
            this.container.setProjectContext({ workspacePath: context.projectPath });
        }
        
        // Auto-detect project ID if missing
        if (!context.projectId && context.projectPath && this.projectMappingService) {
            const projectId = await this.projectMappingService.getProjectIdFromWorkspace(context.projectPath);
            this.container.setProjectContext({ projectId });
        }
    }

    /**
     * Validate project context
     * @returns {Object} Validation result
     */
    async validateProjectContext() {
        const context = this.container.getProjectContext();
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Validate project path exists
        if (context.projectPath) {
            try {
                const stats = await fs.stat(context.projectPath);
                if (!stats.isDirectory()) {
                    result.isValid = false;
                    result.errors.push(`Project path is not a directory: ${context.projectPath}`);
                }
            } catch (error) {
                result.isValid = false;
                result.errors.push(`Project path does not exist: ${context.projectPath}`);
            }
        } else {
            result.warnings.push('Project path not set');
        }

        // Validate workspace path
        if (context.workspacePath && context.workspacePath !== context.projectPath) {
            try {
                const stats = await fs.stat(context.workspacePath);
                if (!stats.isDirectory()) {
                    result.warnings.push(`Workspace path is not a directory: ${context.workspacePath}`);
                }
            } catch (error) {
                result.warnings.push(`Workspace path does not exist: ${context.workspacePath}`);
            }
        }

        return result;
    }

    /**
     * Clear project context
     */
    clearProjectContext() {
        this.container.setProjectContext({
            projectPath: null,
            projectId: null,
            workspacePath: null
        });
    }
}

// Global singleton instance
let globalProjectContextService = null;

/**
 * Get global project context service
 * @returns {ProjectContextService} Global service instance
 */
function getProjectContextService() {
    if (!globalProjectContextService) {
        globalProjectContextService = new ProjectContextService();
    }
    return globalProjectContextService;
}

/**
 * Set global project context service
 * @param {ProjectContextService} service - Project context service
 */
function setProjectContextService(service) {
    globalProjectContextService = service;
}

module.exports = {
    ProjectContextService,
    getProjectContextService,
    setProjectContextService
}; 