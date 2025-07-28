const path = require('path');
const fs = require('fs').promises;
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');


class ProjectMappingService {
    constructor(dependencies = {}) {
        this.projectMappings = new Map();
        this.workspaceMappings = new Map();
        this.monorepoStrategy = dependencies.monorepoStrategy;
    }

    /**
     * Convert workspace path to project ID
     * @param {string} workspacePath - Full workspace path
     * @returns {string} Project ID
     */
    async getProjectIdFromWorkspace(workspacePath) {
        if (!workspacePath) return 'default';
        
        // Extract project name from path
        const pathParts = workspacePath.split('/');
        let projectName = pathParts[pathParts.length - 1];
        
        // Use MonorepoStrategy to detect if it's a monorepo
        if (this.monorepoStrategy) {
            try {
                const isMonorepo = await this.monorepoStrategy.isMonorepo(workspacePath);
                if (isMonorepo) {
                    // For monorepo subdirectories, use parent directory
                    const monorepoSubdirs = ['backend', 'frontend', 'client', 'server', 'api', 'app', 'web', 'mobile'];
                    if (monorepoSubdirs.includes(projectName) && pathParts.length > 1) {
                        projectName = pathParts[pathParts.length - 2];
                    }
                }
            } catch (error) {
                logger.warn('ProjectMappingService: Failed to check monorepo status:', error.message);
            }
        }
        
        // ✅ FIX: Keep original case and remove special characters
        const projectId = projectName.replace(/[^a-zA-Z0-9]/g, '');
        
        // Store mapping
        this.projectMappings.set(projectId, workspacePath);
        this.workspaceMappings.set(workspacePath, projectId);
        
        return projectId;
    }

    /**
     * Get workspace path from project ID
     * @param {string} projectId - Project ID
     * @returns {string} Workspace path
     */
    getWorkspaceFromProjectId(projectId) {
        return this.projectMappings.get(projectId) || null;
    }

    /**
     * Get project ID from workspace path
     * @param {string} workspacePath - Workspace path
     * @returns {string} Project ID
     */
    async getProjectIdFromWorkspacePath(workspacePath) {
        return this.workspaceMappings.get(workspacePath) || await this.getProjectIdFromWorkspace(workspacePath);
    }

    /**
     * Register a workspace mapping
     * @param {string} workspacePath - Workspace path
     * @param {string} projectId - Optional project ID
     * @returns {string} Project ID
     */
    registerWorkspace(workspacePath, projectId = null) {
        if (!workspacePath) return 'default';
        
        const calculatedProjectId = projectId || this.getProjectIdFromWorkspace(workspacePath);
        
        this.projectMappings.set(calculatedProjectId, workspacePath);
        this.workspaceMappings.set(workspacePath, calculatedProjectId);
        
        return calculatedProjectId;
    }

    /**
     * Get all registered projects
     * @returns {Array} Array of project mappings
     */
    getAllProjects() {
        const projects = [];
        for (const [projectId, workspacePath] of this.projectMappings.entries()) {
            projects.push({
                projectId,
                workspacePath,
                projectName: path.basename(workspacePath)
            });
        }
        return projects;
    }

    /**
     * Validate if workspace path exists
     * @param {string} workspacePath - Workspace path to validate
     * @returns {Promise<boolean>} True if path exists and is accessible
     */
    async validateWorkspacePath(workspacePath) {
        try {
            await fs.access(workspacePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get project info
     * @param {string} projectId - Project ID
     * @returns {Object|null} Project info or null if not found
     */
    getProjectInfo(projectId) {
        const workspacePath = this.getWorkspaceFromProjectId(projectId);
        if (!workspacePath) return null;
        
        return {
            projectId,
            workspacePath,
            projectName: path.basename(workspacePath),
            exists: false // Will be validated when needed
        };
    }

    /**
     * Clear all mappings
     */
    clearMappings() {
        this.projectMappings.clear();
        this.workspaceMappings.clear();
    }
}

module.exports = ProjectMappingService; 