/**
 * SingleRepoStrategy - Handles single repository optimization and analysis
 * Refactored version using modular architecture
 */

// Import utilities
const FileUtils = require('./single-repo/utils/fileUtils');
const DirectoryScanner = require('./single-repo/utils/directoryScanner');

// Import services
const DependencyAnalyzer = require('./single-repo/services/dependencyAnalyzer');
const ProjectTypeAnalyzer = require('./single-repo/services/projectTypeAnalyzer');
const StructureAnalyzer = require('./single-repo/services/structureAnalyzer');
const BuildToolsAnalyzer = require('./single-repo/services/buildToolsAnalyzer');
const TestingAnalyzer = require('./single-repo/services/testingAnalyzer');
const LintingAnalyzer = require('./single-repo/services/lintingAnalyzer');
const DeploymentAnalyzer = require('./single-repo/services/deploymentAnalyzer');
const PerformanceAnalyzer = require('./single-repo/services/performanceAnalyzer');
const SecurityAnalyzer = require('./single-repo/services/securityAnalyzer');
const RecommendationsService = require('./single-repo/services/recommendationsService');
const OptimizationService = require('./single-repo/services/optimizationService');

// Import validators
const RepositoryTypeValidator = require('./single-repo/validators/repositoryTypeValidator');

class SingleRepoStrategy {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.eventBus = dependencies.eventBus;
        this.fileSystemService = dependencies.fileSystemService;
        this.projectAnalyzer = dependencies.projectAnalyzer;

        // Initialize utilities
        this.fileUtils = new FileUtils(this.logger);
        this.directoryScanner = new DirectoryScanner(this.logger, this.fileUtils);

        // Initialize services
        this.dependencyAnalyzer = new DependencyAnalyzer(this.logger, this.fileUtils);
        this.projectTypeAnalyzer = new ProjectTypeAnalyzer(this.logger, this.fileUtils);
        this.structureAnalyzer = new StructureAnalyzer(this.logger, this.fileUtils, this.directoryScanner);
        this.buildToolsAnalyzer = new BuildToolsAnalyzer(this.logger, this.fileUtils);
        this.testingAnalyzer = new TestingAnalyzer(this.logger, this.fileUtils, this.directoryScanner);
        this.lintingAnalyzer = new LintingAnalyzer(this.logger, this.fileUtils);
        this.deploymentAnalyzer = new DeploymentAnalyzer(this.logger, this.fileUtils);
        this.performanceAnalyzer = new PerformanceAnalyzer(this.logger, this.fileUtils);
        this.securityAnalyzer = new SecurityAnalyzer(this.logger, this.fileUtils);
        // Use DI system for service creation
        const { getServiceRegistry } = require('../di/ServiceRegistry');
        const registry = getServiceRegistry();
        
        // Get services through DI (they should already be registered)
        try {
            this.recommendationsService = registry.getService('recommendationsService');
            this.optimizationService = registry.getService('optimizationService');
        } catch (error) {
            // Fallback to direct instantiation if services not registered
            const RecommendationsService = require('./single-repo/services/recommendationsService');
            const OptimizationService = require('./single-repo/services/optimizationService');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
            this.recommendationsService = new RecommendationsService(this.logger);
            this.optimizationService = new OptimizationService(this.logger);
        }

        // Initialize validators
        this.repositoryTypeValidator = new RepositoryTypeValidator(this.logger, this.fileUtils);
    }

    /**
     * Check if project is a single repository
     * @param {string} projectPath - Project path
     * @returns {Promise<boolean>} True if single repo
     */
    async isSingleRepo(projectPath) {
        return this.repositoryTypeValidator.isSingleRepo(projectPath);
    }

    /**
     * Analyze single repository structure
     * @param {string} projectPath - Project path
     * @returns {Promise<Object>} Single repo analysis
     */
    async analyzeSingleRepo(projectPath) {
        try {
            this.logger.info('SingleRepoStrategy: Analyzing single repository', { projectPath });

            const analysis = {
                isSingleRepo: true, // Skip the check to avoid infinite loop
                projectType: await this.projectTypeAnalyzer.getProjectType(projectPath),
                structure: await this.structureAnalyzer.analyzeStructure(projectPath),
                dependencies: await this.dependencyAnalyzer.analyzeDependencies(projectPath),
                packages: await this.dependencyAnalyzer.getPackages(projectPath),
                buildTools: await this.buildToolsAnalyzer.detectBuildTools(projectPath),
                testing: await this.testingAnalyzer.analyzeTesting(projectPath),
                linting: await this.lintingAnalyzer.analyzeLinting(projectPath),
                deployment: await this.deploymentAnalyzer.analyzeDeployment(projectPath),
                performance: await this.performanceAnalyzer.analyzePerformance(projectPath),
                security: await this.securityAnalyzer.analyzeSecurity(projectPath),
                recommendations: []
            };

            // Generate recommendations based on complete analysis
            analysis.recommendations = await this.recommendationsService.generateRecommendations(analysis);

            if (this.eventBus) {
                this.eventBus.publish('singlerepo.analysis.completed', {
                    projectPath,
                    analysis,
                    timestamp: new Date()
                });
            }

            return analysis;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to analyze single repo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to analyze single repository: ${error.message}`);
        }
    }

    /**
     * Optimize single repository
     * @param {string} projectPath - Project path
     * @param {Object} options - Optimization options
     * @returns {Promise<Object>} Optimization result
     */
    async optimizeSingleRepo(projectPath, options = {}) {
        try {
            this.logger.info('SingleRepoStrategy: Optimizing single repository', { projectPath });

            const optimizations = await this.optimizationService.optimizeSingleRepo(projectPath, options);

            if (this.eventBus) {
                this.eventBus.publish('singlerepo.optimization.completed', {
                    projectPath,
                    optimizations,
                    timestamp: new Date()
                });
            }

            return optimizations;
        } catch (error) {
            this.logger.error('SingleRepoStrategy: Failed to optimize single repo', {
                projectPath,
                error: error.message
            });
            throw new Error(`Failed to optimize single repository: ${error.message}`);
        }
    }

    // Legacy method aliases for backward compatibility
    async fileExists(filePath) {
        return this.fileUtils.fileExists(filePath);
    }

    async directoryExists(dirPath) {
        return this.fileUtils.directoryExists(dirPath);
    }

    async getProjectType(projectPath) {
        return this.projectTypeAnalyzer.getProjectType(projectPath);
    }

    async analyzeStructure(projectPath) {
        return this.structureAnalyzer.analyzeStructure(projectPath);
    }

    async getDirectoryStats(dirPath) {
        return this.fileUtils.getDirectoryStats(dirPath);
    }

    async scanDirectory(dirPath, structure, depth, maxDepth) {
        return this.directoryScanner.scanDirectory(dirPath, structure, depth, maxDepth);
    }

    shouldSkipDirectory(dirName) {
        return this.directoryScanner.shouldSkipDirectory(dirName);
    }

    async analyzeDependencies(projectPath) {
        return this.dependencyAnalyzer.analyzeDependencies(projectPath);
    }

    async getPackages(projectPath) {
        return this.dependencyAnalyzer.getPackages(projectPath);
    }

    async hasLockFile(projectPath) {
        return this.dependencyAnalyzer.hasLockFile(projectPath);
    }

    async detectPackageManager(projectPath) {
        return this.dependencyAnalyzer.detectPackageManager(projectPath);
    }

    categorizeDependencies(dependencies) {
        return this.dependencyAnalyzer.categorizeDependencies(dependencies);
    }

    isFramework(dep) {
        return this.dependencyAnalyzer.isFramework(dep);
    }

    isBuildTool(dep) {
        return this.dependencyAnalyzer.isBuildTool(dep);
    }

    isTestingTool(dep) {
        return this.dependencyAnalyzer.isTestingTool(dep);
    }

    isLintingTool(dep) {
        return this.dependencyAnalyzer.isLintingTool(dep);
    }

    isDatabase(dep) {
        return this.dependencyAnalyzer.isDatabase(dep);
    }

    isSecurity(dep) {
        return this.dependencyAnalyzer.isSecurity(dep);
    }

    isMonitoring(dep) {
        return this.dependencyAnalyzer.isMonitoring(dep);
    }

    isUtility(dep) {
        return this.dependencyAnalyzer.isUtility(dep);
    }

    generateDependencyRecommendations(analysis) {
        return this.dependencyAnalyzer.generateDependencyRecommendations(analysis);
    }

    async detectBuildTools(projectPath) {
        return this.buildToolsAnalyzer.detectBuildTools(projectPath);
    }

    async hasAnyFile(projectPath, files) {
        return this.fileUtils.hasAnyFile(projectPath, files);
    }

    async analyzeTesting(projectPath) {
        return this.testingAnalyzer.analyzeTesting(projectPath);
    }

    async findTestFiles(projectPath) {
        return this.testingAnalyzer.findTestFiles(projectPath);
    }

    async scanForTestFiles(dirPath, testFiles) {
        return this.directoryScanner.scanForTestFiles(dirPath, testFiles);
    }

    async analyzeLinting(projectPath) {
        return this.lintingAnalyzer.analyzeLinting(projectPath);
    }

    async analyzeDeployment(projectPath) {
        return this.deploymentAnalyzer.analyzeDeployment(projectPath);
    }

    async analyzePerformance(projectPath) {
        return this.performanceAnalyzer.analyzePerformance(projectPath);
    }

    async analyzeSecurity(projectPath) {
        return this.securityAnalyzer.analyzeSecurity(projectPath);
    }

    async generateRecommendations(projectPath) {
        const analysis = await this.analyzeSingleRepo(projectPath);
        return this.recommendationsService.generateRecommendations(analysis);
    }

    async optimizeStructure(projectPath, options) {
        return this.optimizationService.optimizeStructure(projectPath, options);
    }

    async optimizeDependencies(projectPath, options) {
        return this.optimizationService.optimizeDependencies(projectPath, options);
    }

    async optimizeBuild(projectPath, options) {
        return this.optimizationService.optimizeBuild(projectPath, options);
    }

    async optimizeTesting(projectPath, options) {
        return this.optimizationService.optimizeTesting(projectPath, options);
    }

    async optimizeLinting(projectPath, options) {
        return this.optimizationService.optimizeLinting(projectPath, options);
    }

    async optimizeSecurity(projectPath, options) {
        return this.optimizationService.optimizeSecurity(projectPath, options);
    }

    async optimizePerformance(projectPath, options) {
        return this.optimizationService.optimizePerformance(projectPath, options);
    }

    isCodeFile(fileName) {
        return this.fileUtils.isCodeFile(fileName);
    }
}

module.exports = SingleRepoStrategy; 