/**
 * Output Service - Business logic for VibeCoder output generation
 */

class OutputService {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger || console;
        this.analysisOutputService = dependencies.analysisOutputService;
        this.analysisRepository = dependencies.analysisRepository;
        this.eventBus = dependencies.eventBus;
    }

    /**
     * Generate output
     * @param {Object} data - Output data
     * @returns {Promise<Object>} Generated output
     */
    async generateOutput(data) {
        const { command, initialAnalysis, executionStrategy, analyzeResults, refactorResults, generateResults, validationResults, report, outputConfig } = data;

        const output = {
            commandId: command.commandId,
            timestamp: new Date(),
            summary: {
                mode: command.getModeOptions().mode,
                totalPhases: report ? report.summary.totalPhases : 0,
                successfulPhases: report ? report.summary.successfulPhases : 0,
                failedPhases: report ? report.summary.failedPhases : 0,
                successRate: report ? report.summary.successRate : 0,
                validationPassed: validationResults ? validationResults.overall : false
            },
            initialAnalysis: outputConfig && outputConfig.includeRawData ? initialAnalysis : (initialAnalysis ? initialAnalysis.metrics : {}),
            executionStrategy,
            results: {
                analyze: analyzeResults,
                refactor: refactorResults,
                generate: generateResults
            },
            validationResults,
            report,
            recommendations: report ? report.recommendations : []
        };

        if (outputConfig && outputConfig.includeMetrics) {
            output.metrics = {
                before: initialAnalysis ? initialAnalysis.metrics : {},
                after: validationResults && validationResults.metrics ? validationResults.metrics.after : {},
                improvement: validationResults && validationResults.metrics ? validationResults.metrics.improvement : {}
            };
        }

        return output;
    }

    /**
     * Save results
     * @param {Object} command - Command object
     * @param {Object} output - Output object
     * @returns {Promise<void>}
     */
    async saveResults(command, output) {
        try {
            // Save to database
            await this.analysisRepository.save({
                id: command.commandId,
                type: 'vibecoder_mode',
                projectPath: command.projectPath,
                data: output,
                timestamp: new Date(),
                metadata: command.getMetadata()
            });

            // Save to output files using AnalysisOutputService
            if (this.analysisOutputService) {
                const projectId = command.commandId;
                
                // Prepare analysis results for markdown generation
                const analysisResults = {};
                
                // Add analyze phase results
                if (output.results && output.results.analyze && output.results.analyze.results) {
                    const analyzeResults = output.results.analyze.results;
                    
                    // Extract individual analysis results
                    if (analyzeResults.structure) {
                        analysisResults['Repository Structure'] = { 
                            data: analyzeResults.structure.result,
                            metrics: analyzeResults.structure.metrics,
                            recommendations: analyzeResults.structure.recommendations
                        };
                    }
                    
                    if (analyzeResults.architecture) {
                        analysisResults['Architecture'] = { 
                            data: analyzeResults.architecture.result,
                            metrics: analyzeResults.architecture.metrics,
                            recommendations: analyzeResults.architecture.recommendations
                        };
                    }
                    
                    if (analyzeResults.codeQuality) {
                        analysisResults['Code Quality'] = { 
                            data: analyzeResults.codeQuality.result,
                            metrics: analyzeResults.codeQuality.metrics,
                            recommendations: analyzeResults.codeQuality.recommendations
                        };
                    }
                    
                    if (analyzeResults.dependencies) {
                        analysisResults['Dependencies'] = { 
                            data: analyzeResults.dependencies.result,
                            metrics: analyzeResults.dependencies.metrics,
                            recommendations: analyzeResults.dependencies.recommendations
                        };
                    }
                    
                    if (analyzeResults.techStack) {
                        analysisResults['Tech Stack'] = { 
                            data: analyzeResults.techStack.result,
                            metrics: analyzeResults.techStack.metrics,
                            recommendations: analyzeResults.techStack.recommendations
                        };
                    } else if (analyzeResults.techStack) {
                        // Handle direct tech stack data
                        analysisResults['Tech Stack'] = { 
                            data: analyzeResults.techStack,
                            metrics: analyzeResults.techStack.metrics || {},
                            recommendations: analyzeResults.techStack.recommendations || []
                        };
                    }

                    // Add dependencies analysis
                    if (analyzeResults.dependencies) {
                        analysisResults['Dependencies'] = { 
                            data: analyzeResults.dependencies.result || analyzeResults.dependencies,
                            metrics: analyzeResults.dependencies.metrics || {},
                            recommendations: analyzeResults.dependencies.recommendations || []
                        };
                    }

                    // Add performance analysis
                    if (analyzeResults.performance) {
                        analysisResults['Performance'] = { 
                            data: analyzeResults.performance.result || analyzeResults.performance,
                            metrics: analyzeResults.performance.metrics || {},
                            recommendations: analyzeResults.performance.recommendations || []
                        };
                    }

                    // Add security analysis
                    if (analyzeResults.security) {
                        analysisResults['Security'] = { 
                            data: analyzeResults.security.result || analyzeResults.security,
                            metrics: analyzeResults.security.metrics || {},
                            recommendations: analyzeResults.security.recommendations || []
                        };
                    }
                }
                
                // Add refactor phase results
                if (output.results && output.results.refactor) {
                    analysisResults['Refactoring'] = { 
                        data: output.results.refactor,
                        metrics: output.results.refactor.metrics,
                        recommendations: output.results.refactor.recommendations
                    };
                }
                
                // Add generate phase results
                if (output.results && output.results.generate) {
                    analysisResults['Generation'] = { 
                        data: output.results.generate,
                        metrics: output.results.generate.metrics,
                        recommendations: output.results.generate.recommendations
                    };
                }
                
                // Generate comprehensive markdown report
                if (Object.keys(analysisResults).length > 0) {
                    this.logger.info('Generating markdown report with analysis results:', {
                        projectId,
                        analysisTypes: Object.keys(analysisResults)
                    });
                    
                    await this.analysisOutputService.generateMarkdownReport(
                        projectId,
                        analysisResults
                    );
                } else {
                    this.logger.warn('No analysis results found for markdown generation');
                }
                
                // Also save raw JSON for reference
                await this.analysisOutputService.saveAnalysisResult(
                    projectId, 
                    'vibecoder_mode', 
                    output
                );
            }

            await this.eventBus.publish('vibecoder.mode.completed', {
                commandId: command.commandId,
                projectPath: command.projectPath,
                results: output,
                timestamp: new Date()
            });
        } catch (error) {
            this.logger.error('Failed to save VibeCoder mode results:', error);
        }
    }
}

module.exports = OutputService; 