/**
 * Project Analysis Service
 * Handles project analysis for script generation
 */

const { CONFIG_FILE_MAPPING } = require('../constants/ScriptGenerationConstants');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

class ProjectAnalysisService {
    constructor(dependencies = {}) {
        this.fileSystemService = dependencies.fileSystemService;
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.logger = dependencies.logger;
    }

    /**
     * Analyze project for script generation
     * @param {string} projectPath - Project path
     * @param {string} scriptType - Script type
     * @returns {Promise<Object>} Project context for scripts
     */
    async analyzeProjectForScripts(projectPath, scriptType) {
        try {
            this.logger.info('ProjectAnalysisService: Analyzing project for script generation', {
                projectPath,
                scriptType
            });

            // Get project structure
            const projectStructure = await this.projectAnalyzer.getProjectStructure(projectPath);

            // Get package.json information
            const packageJson = await this.getPackageJsonInfo(projectPath);

            // Get existing scripts
            const existingScripts = await this.getExistingScripts(projectPath);

            // Get project type and framework
            const projectType = await this.projectAnalyzer.detectProjectType(projectPath);

            // Get build tools
            const buildTools = await this.detectBuildTools(projectPath);

            return {
                projectStructure,
                packageJson,
                existingScripts,
                projectType,
                buildTools,
                scriptType,
                options: {}
            };

        } catch (error) {
            this.logger.error('ProjectAnalysisService: Failed to analyze project for scripts', {
                projectPath,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Get package.json information
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Package.json information
     */
    async getPackageJsonInfo(projectPath) {
        try {
            const packageJsonPath = `${projectPath}/package.json`;
            const exists = await this.fileSystemService.exists(packageJsonPath);
            
            if (!exists) {
                return null;
            }

            const content = await this.fileSystemService.readFile(packageJsonPath);
            const packageData = JSON.parse(content);

            return {
                name: packageData.name,
                version: packageData.version,
                scripts: packageData.scripts || {},
                dependencies: packageData.dependencies || {},
                devDependencies: packageData.devDependencies || {},
                engines: packageData.engines || {},
                type: packageData.type || 'commonjs'
            };
        } catch (error) {
            this.logger.warn('ProjectAnalysisService: Failed to read package.json', {
                projectPath,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get existing scripts
     * @param {string} projectPath - Project path
     * @returns {Promise<Array>} Existing scripts
     */
    async getExistingScripts(projectPath) {
        try {
            const scripts = [];

            // Check for package.json scripts
            const packageJson = await this.getPackageJsonInfo(projectPath);
            if (packageJson && packageJson.scripts) {
                Object.entries(packageJson.scripts).forEach(([name, command]) => {
                    scripts.push({
                        name,
                        command,
                        type: 'npm',
                        location: 'package.json'
                    });
                });
            }

            // Check for shell scripts
            const shellScripts = await this.fileSystemService.findFiles(projectPath, {
                pattern: '*.sh',
                recursive: true
            });

            for (const script of shellScripts) {
                const content = await this.fileSystemService.readFile(script);
                scripts.push({
                    name: script.split('/').pop(),
                    command: content,
                    type: 'shell',
                    location: script
                });
            }

            // Check for batch files (Windows)
            const batchFiles = await this.fileSystemService.findFiles(projectPath, {
                pattern: '*.bat',
                recursive: true
            });

            for (const script of batchFiles) {
                const content = await this.fileSystemService.readFile(script);
                scripts.push({
                    name: script.split('/').pop(),
                    command: content,
                    type: 'batch',
                    location: script
                });
            }

            return scripts;

        } catch (error) {
            this.logger.warn('ProjectAnalysisService: Failed to get existing scripts', {
                projectPath,
                error: error.message
            });
            return [];
        }
    }

    /**
     * Detect build tools
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Build tools information
     */
    async detectBuildTools(projectPath) {
        try {
            const buildTools = {
                webpack: false,
                vite: false,
                rollup: false,
                esbuild: false,
                parcel: false,
                gulp: false,
                grunt: false,
                make: false,
                cmake: false,
                maven: false,
                gradle: false,
                cargo: false,
                go: false,
                python: false
            };

            // Check for configuration files
            const configFiles = Object.keys(CONFIG_FILE_MAPPING);

            for (const file of configFiles) {
                const exists = await this.fileSystemService.exists(`${projectPath}/${file}`);
                if (exists) {
                    const tool = this.getToolFromConfigFile(file);
                    if (tool) {
                        buildTools[tool] = true;
                    }
                }
            }

            return buildTools;

        } catch (error) {
            this.logger.warn('ProjectAnalysisService: Failed to detect build tools', {
                projectPath,
                error: error.message
            });
            return {};
        }
    }

    /**
     * Get tool from config file
     * @param {string} filename - Config filename
     * @returns {string|null} Tool name
     */
    getToolFromConfigFile(filename) {
        return CONFIG_FILE_MAPPING[filename] || null;
    }
}

module.exports = ProjectAnalysisService; 