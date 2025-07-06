/**
 * VibeCoderModeHandler - Ultimate orchestrator for all VibeCoder operations
 * Implements the Handler pattern for coordinating analyze, refactor, and generate operations
 * 
 * This file has been refactored to use a modular architecture for better maintainability.
 * The original functionality has been split into focused service modules:
 * - AnalysisService: Handles analysis operations
 * - SecurityService: Handles security calculations
 * - RecommendationService: Handles recommendation generation
 * - MetricsService: Handles metrics calculations
 * - ExecutionService: Handles execution strategy and phase execution
 * - ValidationService: Handles validation operations
 * - ReportService: Handles report generation
 * - OutputService: Handles output generation and saving
 * - AnalysisUtils: Utility functions
 * - ANALYSIS_CONSTANTS: Configuration constants
 */
const EventBus = require('../../../infrastructure/messaging/EventBus');
const AnalysisRepository = require('../../../domain/repositories/AnalysisRepository');
const CommandBus = require('../../../infrastructure/messaging/CommandBus');
const AnalyzeRepoStructureCommand = require('../../commands/analyze/AnalyzeRepoStructureCommand');
const AnalyzeArchitectureCommand = require('../../commands/analyze/AnalyzeArchitectureCommand');
const AnalyzeCodeQualityCommand = require('../../commands/analyze/AnalyzeCodeQualityCommand');
const AnalyzeDependenciesCommand = require('../../commands/analyze/AnalyzeDependenciesCommand');
const AnalyzeTechStackCommand = require('../../commands/analyze/AnalyzeTechStackCommand');
const { SubprojectDetector } = require('../../../domain/services');
const path = require('path');
const fs = require('fs');

// Import extracted modules
const {
    AnalysisService,
    SecurityService,
    RecommendationService,
    MetricsService,
    ExecutionService,
    ValidationService,
    ReportService,
    OutputService
} = require('./services');

const { AnalysisUtils } = require('./utils');
const { ANALYSIS_CONSTANTS } = require('./constants');

class VibeCoderModeHandler {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventBus();
        this.analysisRepository = dependencies.analysisRepository || new AnalysisRepository();
        this.commandBus = dependencies.commandBus || new CommandBus();
        this.logger = dependencies.logger || console;
        this.subprojectDetector = dependencies.subprojectDetector || new SubprojectDetector();
        this.analysisOutputService = dependencies.analysisOutputService;
        
        // Initialize analyzers
        this.projectAnalyzer = dependencies.projectAnalyzer;
        this.codeQualityAnalyzer = dependencies.codeQualityAnalyzer;
        this.architectureAnalyzer = dependencies.architectureAnalyzer;
        this.dependencyAnalyzer = dependencies.dependencyAnalyzer;
        this.securityAnalyzer = dependencies.securityAnalyzer;
        this.performanceAnalyzer = dependencies.performanceAnalyzer;

        // Initialize services
        this.analysisService = new AnalysisService({
            logger: this.logger,
            projectAnalyzer: this.projectAnalyzer,
            codeQualityAnalyzer: this.codeQualityAnalyzer,
            architectureAnalyzer: this.architectureAnalyzer,
            dependencyAnalyzer: this.dependencyAnalyzer,
            securityAnalyzer: this.securityAnalyzer,
            performanceAnalyzer: this.performanceAnalyzer
        });

        this.securityService = new SecurityService({ logger: this.logger });
        this.recommendationService = new RecommendationService({ logger: this.logger });
        this.metricsService = new MetricsService({ logger: this.logger });
        this.executionService = new ExecutionService({ 
            logger: this.logger, 
            commandBus: this.commandBus 
        });
        this.validationService = new ValidationService({ logger: this.logger });
        this.reportService = new ReportService({ logger: this.logger });
        this.outputService = new OutputService({ 
            logger: this.logger, 
            analysisOutputService: this.analysisOutputService 
        });

        // Initialize utils
        this.analysisUtils = new AnalysisUtils(this.logger);
    }

    async handle(command) {
        this.logger.info(`Starting VibeCoder mode orchestration for project: ${command.projectPath}`);

        try {
            // Debug: Check if eventBus is properly initialized
            if (!this.eventBus) {
                this.logger.error('EventBus is not initialized');
                throw new Error('EventBus is not initialized');
            }

            if (typeof this.eventBus.publish !== 'function') {
                this.logger.error('EventBus.publish is not a function', {
                    eventBusType: typeof this.eventBus,
                    eventBusKeys: Object.keys(this.eventBus || {})
                });
                throw new Error('EventBus.publish is not a function');
            }

            const validation = command.validateBusinessRules();
            if (!validation.isValid) {
                throw new Error(`Business rule validation failed: ${validation.errors.join(', ')}`);
            }

            const options = command.getModeOptions();
            const outputConfig = command.getOutputConfiguration();

            const projectPath = command.projectPath;
            // 1. Subprojekte erkennen
            const subprojects = await this.subprojectDetector.detectSubprojects(projectPath);
            let results = {};
            let errors = [];
            if (subprojects.length > 1) {
                // Monorepo-Strategie: Alle Subprojekte analysieren
                await Promise.all(subprojects.map(async (sub) => {
                    try {
                        results[sub.path] = await this.analysisService.analyzeSubproject(sub);
                    } catch (e) {
                        errors.push({ path: sub.path, error: e.message });
                    }
                }));
            } else if (subprojects.length === 1) {
                // Single-Repo-Strategie: Nur ein Subprojekt
                try {
                    results[subprojects[0].path] = await this.analysisService.analyzeSubproject(subprojects[0]);
                } catch (e) {
                    errors.push({ path: subprojects[0].path, error: e.message });
                }
            } else {
                // Fallback: Root analysieren
                try {
                    results[projectPath] = await this.analysisService.analyzeSubproject({ path: projectPath, type: 'unknown', meta: {} });
                } catch (e) {
                    errors.push({ path: projectPath, error: e.message });
                }
            }
            // 2. Ergebnisse aggregieren
            const aggregated = this.analysisUtils.aggregateResults(results, errors);

            // Step 2: Determine optimal execution strategy
            const executionStrategy = await this.executionService.determineExecutionStrategy(aggregated, options);
            
            // Step 3: Execute analyze phase
            const analyzeResults = await this.executionService.executeAnalyzePhase(command, executionStrategy);
            
            // Step 4: Execute refactor phase (if enabled)
            let refactorResults = null;
            if (options.includeRefactor && analyzeResults.recommendations.refactor) {
                refactorResults = await this.executionService.executeRefactorPhase(command, executionStrategy, analyzeResults);
            }
            
            // Step 5: Execute generate phase (if enabled)
            let generateResults = null;
            if (options.includeGenerate && analyzeResults.recommendations.generate) {
                generateResults = await this.executionService.executeGeneratePhase(command, executionStrategy, analyzeResults, refactorResults);
            }
            
            // Step 6: Validate overall results
            const validationResults = await this.validationService.validateOverallResults(projectPath, {
                analyze: analyzeResults,
                refactor: refactorResults,
                generate: generateResults
            });
            
            // Step 7: Generate comprehensive report
            const report = await this.reportService.generateComprehensiveReport(command, {
                analyze: analyzeResults,
                refactor: refactorResults,
                generate: generateResults
            }, validationResults);
            
            // Step 8: Generate output
            const output = await this.outputService.generateOutput({
                command,
                initialAnalysis: aggregated,
                executionStrategy,
                analyzeResults,
                refactorResults,
                generateResults,
                validationResults,
                report,
                outputConfig
            });

            // Step 9: Save results
            await this.outputService.saveResults(command, output);

            this.logger.info(`VibeCoder mode orchestration completed successfully for project: ${command.projectPath}`);
            
            return {
                success: true,
                commandId: command.commandId,
                output,
                metadata: command.getMetadata()
            };

        } catch (error) {
            this.logger.error(`VibeCoder mode orchestration failed for project ${command.projectPath}:`, error);
            
            if (this.eventBus && typeof this.eventBus.publish === 'function') {
                await this.eventBus.publish('vibecoder.mode.failed', {
                    commandId: command.commandId,
                    projectPath: command.projectPath,
                    error: error.message,
                    timestamp: new Date()
                });
            }

            throw error;
        }
    }
}

module.exports = VibeCoderModeHandler; 