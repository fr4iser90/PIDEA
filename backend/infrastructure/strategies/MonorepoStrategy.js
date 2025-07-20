/**
 * MonorepoStrategy - Router to Step System for Monorepo Analysis
 * Detects monorepo type and calls existing steps for analysis
 */
const path = require('path');
const fs = require('fs').promises;
const ServiceLogger = require('@logging/ServiceLogger');

class MonorepoStrategy {
    constructor(dependencies = {}) {
        this.logger = new ServiceLogger('MonorepoStrategy');
        this.eventBus = dependencies.eventBus;
        this.fileSystemService = dependencies.fileSystemService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.container = dependencies.container;
        this.stepRegistry = dependencies.stepRegistry;
    }

    /**
     * Check if project is a monorepo
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if monorepo
     */
    async isMonorepo(projectPath) {
        try {
            // Check for common monorepo indicators
            const indicators = [
                'lerna.json',
                'nx.json',
                'rush.json',
                'pnpm-workspace.yaml',
                'yarn.workspaces',
                'package.json' // Check for workspaces
            ];

            for (const indicator of indicators) {
                if (await this.hasMonorepoIndicator(projectPath, indicator)) {
                    return true;
                }
            }

            // Check for common monorepo directory structures
            const commonDirs = ['packages', 'apps', 'libs', 'services', 'frontend', 'backend'];
            const projectDirs = await this.getProjectDirectories(projectPath);
            
            return commonDirs.some(dir => projectDirs.includes(dir));
        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to check if monorepo', {
                projectPath,
                error: error.message
            });
            return false;
        }
    }

    /**
     * Check for monorepo indicator file
     * @param {string} projectPath - Project path
     * @param {string} indicator - Indicator file name
     * @returns {Promise<boolean>} True if indicator exists
     */
    async hasMonorepoIndicator(projectPath, indicator) {
        try {
            if (indicator === 'package.json') {
                const packageJsonPath = path.join(projectPath, 'package.json');
                const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
                return !!(packageJson.workspaces || packageJson.private);
            } else {
                await fs.access(path.join(projectPath, indicator));
                return true;
            }
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
     * Get monorepo type
     * @param {string} projectPath - Project path
     * @returns {Promise<string>} Monorepo type
     */
    async getMonorepoType(projectPath) {
        try {
            if (await this.fileExists(path.join(projectPath, 'lerna.json'))) {
                return 'lerna';
            } else if (await this.fileExists(path.join(projectPath, 'nx.json'))) {
                return 'nx';
            } else if (await this.fileExists(path.join(projectPath, 'rush.json'))) {
                return 'rush';
            } else if (await this.fileExists(path.join(projectPath, 'pnpm-workspace.yaml'))) {
                return 'pnpm';
            } else if (await this.hasYarnWorkspaces(projectPath)) {
                return 'yarn';
            } else {
                return 'npm'; // Default to npm workspaces
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
     * Check for Yarn workspaces
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if has Yarn workspaces
     */
    async hasYarnWorkspaces(projectPath) {
        try {
            const packageJsonPath = path.join(projectPath, 'package.json');
            const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
            return !!(packageJson.workspaces && Array.isArray(packageJson.workspaces));
        } catch {
            return false;
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
                workspaces: packageJson.workspaces || [],
                private: packageJson.private || false
            };
        } catch (error) {
            this.logger.warn('Failed to read package.json:', error.message);
            return { name: 'unknown', version: 'unknown', workspaces: [], private: false };
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
     * Get ports from docker-compose.yml
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Port configuration
     */
    async getPorts(projectPath) {
        try {
            const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
            if (!await this.fileExists(dockerComposePath)) {
                return {};
            }

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
        } catch (error) {
            this.logger.warn('Failed to read docker-compose.yml:', error.message);
            return {};
        }
    }

    /**
     * Analyze monorepo using orchestrated steps
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Monorepo analysis
     */
    async analyzeMonorepo(projectPath) {
        try {
            this.logger.info('MonorepoStrategy: Starting orchestrated analysis');

            // 1. Base monorepo detection
            const monorepoType = await this.getMonorepoType(projectPath);
            
            // 2. Base results
            const results = {
                isMonorepo: true,
                type: monorepoType,
                workpath: projectPath,
                manifest: await this.getManifest(projectPath),
                commands: await this.getCommands(projectPath),
                ports: await this.getPorts(projectPath)
            };

            // 3. Orchestrate analysis steps
            if (this.stepRegistry) {
                try {
                    this.logger.info('MonorepoStrategy: Orchestrating analysis steps...');
                    
                    // Tech Stack Analysis (Framework detection)
                    const techStackResult = await this.stepRegistry.executeStep('TechStackAnalysisStep', {
                        projectPath: projectPath,
                        includeFrameworks: true,
                        includeLibraries: true,
                        includeTools: true
                    });
                    
                    if (techStackResult.success) {
                        results.techStack = techStackResult.result;
                        this.logger.info('MonorepoStrategy: Tech stack analysis completed');
                    }
                    
                    // Manifest Analysis (Subdirectory detection)
                    const manifestResult = await this.stepRegistry.executeStep('ManifestAnalysisStep', {
                        projectPath: projectPath,
                        analyzeSubdirectories: true,
                        includeDependencies: true
                    });
                    
                    if (manifestResult.success) {
                        results.subdirectories = manifestResult.result;
                        this.logger.info('MonorepoStrategy: Manifest analysis completed');
                    }
                    
                    // Project Analysis (Overall structure)
                    const projectResult = await this.stepRegistry.executeStep('ProjectAnalysisStep', {
                        projectPath: projectPath,
                        includeArchitecture: true
                    });
                    
                    if (projectResult.success) {
                        results.projectStructure = projectResult.result;
                        this.logger.info('MonorepoStrategy: Project analysis completed');
                    }
                    
                    // Dependency Analysis (Cross-dependencies)
                    const dependencyResult = await this.stepRegistry.executeStep('DependencyAnalysisStep', {
                        projectPath: projectPath,
                        includeCrossDependencies: true
                    });
                    
                    if (dependencyResult.success) {
                        results.dependencies = dependencyResult.result;
                        this.logger.info('MonorepoStrategy: Dependency analysis completed');
                    }
                    
                } catch (stepError) {
                    this.logger.warn('MonorepoStrategy: Step execution failed:', stepError.message);
                }
            } else {
                this.logger.warn('MonorepoStrategy: StepRegistry not available, using basic analysis only');
            }

            // 4. Publish event
            if (this.eventBus) {
                this.eventBus.publish('monorepo.analysis.completed', {
                    projectPath,
                    results,
                    timestamp: new Date()
                });
            }

            this.logger.info('MonorepoStrategy: Orchestrated analysis completed');
            return results;

        } catch (error) {
            this.logger.error('MonorepoStrategy: Failed to analyze monorepo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to analyze monorepo: ${error.message}`);
        }
    }
}

module.exports = MonorepoStrategy; 