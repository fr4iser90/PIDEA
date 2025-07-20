/**
 * SingleRepoStrategy - Router to Step System for Single Repository Analysis
 * Detects project type and calls existing steps for analysis
 */

const path = require('path');
const fs = require('fs').promises;
const ServiceLogger = require('@logging/ServiceLogger');

class SingleRepoStrategy {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('SingleRepoStrategy');
        this.eventBus = dependencies.eventBus;
        this.fileSystemService = dependencies.fileSystemService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.container = dependencies.container;
        this.stepRegistry = dependencies.stepRegistry;
    }

    /**
     * Check if project is a single repository
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if single repo
     */
    async isSingleRepo(projectPath) {
        try {
            // Check if it's NOT a monorepo
            const monorepoIndicators = [
                'lerna.json',
                'nx.json',
                'rush.json',
                'pnpm-workspace.yaml'
            ];

            for (const indicator of monorepoIndicators) {
                if (await this.fileExists(path.join(projectPath, indicator))) {
                    return false; // It's a monorepo
                }
            }

            // Check package.json for workspaces
            try {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                if (packageJson.workspaces) {
                    return false; // It's a monorepo
                }
            } catch {
                // No package.json or invalid, assume single repo
            }

            // Check for common monorepo directory structures
            const monorepoDirs = ['packages', 'apps', 'libs', 'services'];
            const projectDirs = await this.getProjectDirectories(projectPath);
            
            if (monorepoDirs.some(dir => projectDirs.includes(dir))) {
                return false; // It's a monorepo
            }

            return true; // It's a single repo
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to check if single repo', {
                projectPath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Get project type
     * @param {string} projectPath - Project path
     * @returns {Promise<string>} Project type
     */
    async getProjectType(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

            // Framework detection
            if (dependencies.react) {
                return 'react';
            } else if (dependencies.vue) {
                return 'vue';
            } else if (dependencies.angular) {
                return 'angular';
            } else if (dependencies.express) {
                return 'express';
            } else if (dependencies.koa) {
                return 'koa';
            } else if (dependencies.fastify) {
                return 'fastify';
            } else if (dependencies.nest) {
                return 'nestjs';
            } else if (dependencies.next) {
                return 'nextjs';
            } else if (dependencies.nuxt) {
                return 'nuxtjs';
            } else if (dependencies.gatsby) {
                return 'gatsby';
            } else if (dependencies.typescript) {
                return 'typescript';
            } else if (dependencies.javascript) {
                return 'javascript';
            } else {
                return 'nodejs';
            }
        } catch {
            return 'unknown';
        }
    }

    /**
     * Check if file exists
     * @param {string} filePath - File path
     * @returns {Promise<boolean>} True if file exists
     */
    async fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get project directories
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Directory list
     */
    async getProjectDirectories(projectPath) {
        try {
            const entries = await fs.readdir(projectPath, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory === true)
                .map(entry => entry.name);
        } catch {
            return [];
        }
    }

    /**
     * Get manifest (package.json)
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Package.json content
     */
    async getManifest(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            return {
                name: packageJson.name,
                version: packageJson.version,
                private: packageJson.private || false
            };
        } catch (error) {
            this.logger.warn('Failed to read package.json:', error.message);
            return { name: 'unknown', version: 'unknown', private: false };
        }
    }

    /**
     * Get commands (npm scripts)
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Available commands
     */
    async getCommands(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            
            return packageJson.scripts || {};
        } catch (error) {
            this.logger.warn('Failed to read npm scripts:', error.message);
            return {};
        }
    }

    /**
     * Get ports from docker-compose.yml or package.json
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Port configuration
     */
    async getPorts(projectPath) {
        try {
            // First try docker-compose.yml
            const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
            if (await this.fileExists(dockerComposePath)) {
                const dockerCompose = await fs.readFile(dockerComposePath, 'utf8');
                const ports = {};

                // Simple regex to extract ports
                const portMatches = dockerCompose.match(/"(\d+):(\d+)"/g);
                if (portMatches) {
                    portMatches.forEach(match => {
                        const [hostPort, containerPort] = match.replace(/"/g, '').split(':');
                        ports[`port_${hostPort}`] = parseInt(hostPort);
                    });
                }

                return ports;
            }

            // Fallback to package.json scripts
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            const scripts = packageJson.scripts || {};
            const ports = {};

            // Look for port in scripts
            for (const [scriptName, script] of Object.entries(scripts)) {
                const portMatch = script.match(/--port\s+(\d+)/);
                if (portMatch) {
                    ports[`port_${scriptName}`] = parseInt(portMatch[1]);
                }
            }

            return ports;
        } catch (error) {
            this.logger.warn('Failed to read ports:', error.message);
            return {};
        }
    }

    /**
     * Analyze single repository using orchestrated steps
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Single repo analysis
     */
    async analyzeSingleRepo(projectPath) {
        try {
            this.logger.info('SingleRepoStrategy: Starting orchestrated analysis');

            // 1. Detect project type
            const projectType = await this.getProjectType(projectPath);
            
            // 2. Base results
            const results = {
                isSingleRepo: true,
                type: projectType,
                workpath: projectPath,
                manifest: await this.getManifest(projectPath),
                commands: await this.getCommands(projectPath),
                ports: await this.getPorts(projectPath)
            };

            // 3. Orchestrate analysis steps
            if (this.stepRegistry) {
                try {
                    this.logger.info('SingleRepoStrategy: Orchestrating analysis steps...');
                    
                    // Tech Stack Analysis (Framework detection)
                    const techStackResult = await this.stepRegistry.executeStep('TechStackAnalysisStep', {
                        projectPath: projectPath,
                        includeFrameworks: true,
                        includeLibraries: true,
                        includeTools: true
                    });
                    
                    if (techStackResult.success) {
                        results.techStack = techStackResult.result;
                        this.logger.info('SingleRepoStrategy: Tech stack analysis completed');
                    }
                    
                    // Manifest Analysis (Dependencies)
                    const manifestResult = await this.stepRegistry.executeStep('ManifestAnalysisStep', {
                        projectPath: projectPath,
                        includeDependencies: true,
                        includeScripts: true
                    });
                    
                    if (manifestResult.success) {
                        results.manifestDetails = manifestResult.result;
                        this.logger.info('SingleRepoStrategy: Manifest analysis completed');
                    }
                    
                    // Project Analysis (Structure)
                    const projectResult = await this.stepRegistry.executeStep('ProjectAnalysisStep', {
                        projectPath: projectPath,
                        includeArchitecture: true
                    });
                    
                    if (projectResult.success) {
                        results.projectStructure = projectResult.result;
                        this.logger.info('SingleRepoStrategy: Project analysis completed');
                    }
                    
                    // Code Quality Analysis
                    const codeQualityResult = await this.stepRegistry.executeStep('CodeQualityAnalysisStep', {
                        projectPath: projectPath,
                        includeMetrics: true
                    });
                    
                    if (codeQualityResult.success) {
                        results.codeQuality = codeQualityResult.result;
                        this.logger.info('SingleRepoStrategy: Code quality analysis completed');
                    }
                    
                } catch (stepError) {
                    this.logger.warn('SingleRepoStrategy: Step execution failed:', stepError.message);
                }
            } else {
                this.logger.warn('SingleRepoStrategy: StepRegistry not available, using basic analysis only');
            }

            // 4. Publish event
            if (this.eventBus) {
                this.eventBus.publish('singlerepo.analysis.completed', {
                    projectPath,
                    results,
                    timestamp: new Date()
                });
            }

            this.logger.info('SingleRepoStrategy: Orchestrated analysis completed');
            return results;

        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze single repo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to analyze single repository: ${error.message}`);
        }
    }
}

module.exports = SingleRepoStrategy; 