
/**
 * Unit tests for AdvancedAnalysisService
 */
const AdvancedAnalysisService = require('@services/AdvancedAnalysisService');
const LayerValidationService = require('@services/LayerValidationService');
const LogicValidationService = require('@services/LogicValidationService');
const TaskAnalysisService = require('@services/TaskAnalysisService');
const Logger = require('@logging/Logger');
const logger = new Logger('Logger');

// Mock dependencies
jest.mock('@/domain/services/LayerValidationService');
jest.mock('@/domain/services/LogicValidationService');
jest.mock('@/domain/services/TaskAnalysisService');

describe('AdvancedAnalysisService', () => {
    let service;
    let mockLogger;
    let mockLayerValidationService;
    let mockLogicValidationService;
    let mockTaskAnalysisService;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create mock instances
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };

        mockLayerValidationService = {
            validateLayers: jest.fn()
        };

        mockLogicValidationService = {
            validateLogic: jest.fn()
        };

        mockTaskAnalysisService = {
            analyzeProject: jest.fn()
        };

        // Mock constructor calls
        LayerValidationService.mockImplementation(() => mockLayerValidationService);
        LogicValidationService.mockImplementation(() => mockLogicValidationService);

        // Create service instance
        service = new AdvancedAnalysisService({
            logger: mockLogger,
            taskAnalysisService: mockTaskAnalysisService
        });
    });

    describe('constructor', () => {
        test('should initialize with dependencies', () => {
            expect(service.logger).toBe(mockLogger);
            expect(service.layerValidationService).toBe(mockLayerValidationService);
            expect(service.logicValidationService).toBe(mockLogicValidationService);
            expect(service.taskAnalysisService).toBe(mockTaskAnalysisService);
        });

        test('should create default instances when dependencies not provided', () => {
            const defaultService = new AdvancedAnalysisService();

            expect(defaultService.logger).toBe(console);
            expect(defaultService.layerValidationService).toBeInstanceOf(LayerValidationService);
            expect(defaultService.logicValidationService).toBeInstanceOf(LogicValidationService);
            expect(defaultService.taskAnalysisService).toBeInstanceOf(TaskAnalysisService);
        });
    });

    describe('performAdvancedAnalysis', () => {
        const projectPath = '/test/project';
        const options = {
            includeLayerValidation: true,
            includeLogicValidation: true,
            includeStandardAnalysis: true,
            generateReport: true
        };

        test('should perform comprehensive advanced analysis', async () => {
            const mockStandardAnalysis = {
                projectStructure: { type: 'nodejs', files: ['package.json'] },
                codeQuality: { issues: [] },
                security: { vulnerabilities: [] },
                performance: { issues: [], bundleSize: 500000, slowOperations: [] },
                insights: ['Good project structure'],
                recommendations: [{ title: 'Add tests', priority: 'medium' }]
            };

            const mockLayerValidation = {
                overall: true,
                layers: {
                    presentation: { files: ['src/ui/App.jsx'] },
                    domain: { files: ['src/domain/User.js'] },
                    infrastructure: { files: ['src/infrastructure/Database.js'] }
                },
                violations: [],
                metrics: { overallScore: 90 }
            };

            const mockLogicValidation = {
                overall: true,
                businessLogic: { patterns: [], violations: [] },
                errorHandling: { patterns: [], violations: [] },
                security: { 
                    patterns: [], 
                    violations: [],
                    metrics: { securityChecks: 5 }
                },
                dataFlow: { patterns: [], violations: [] },
                violations: [],
                metrics: { overallScore: 85 }
            };

            mockTaskAnalysisService.analyzeProject.mockResolvedValue(mockStandardAnalysis);
            mockLayerValidationService.validateLayers.mockResolvedValue(mockLayerValidation);
            mockLogicValidationService.validateLogic.mockResolvedValue(mockLogicValidation);

            const result = await service.performAdvancedAnalysis(projectPath, options);

            // Debug: Log the actual result to understand why overall is false
            logger.debug('Debug - Result overall:', result.overall);
            logger.debug('Debug - Result metrics:', result.metrics);
            logger.debug('Debug - Layer validation overall:', result.layerValidation.overall);
            logger.debug('Debug - Logic validation overall:', result.logicValidation.overall);

            expect(result.projectPath).toBe(projectPath);
            expect(result.timestamp).toBeInstanceOf(Date);
            expect(result.overall).toBe(true);
            expect(result.standardAnalysis).toEqual(mockStandardAnalysis);
            expect(result.layerValidation).toEqual(mockLayerValidation);
            expect(result.logicValidation).toEqual(mockLogicValidation);
            expect(result.integratedInsights).toBeInstanceOf(Array);
            expect(result.recommendations).toBeInstanceOf(Array);
            expect(result.metrics).toEqual({
                overallScore: expect.any(Number),
                layerScore: 90,
                logicScore: 85,
                standardScore: expect.any(Number),
                breakdown: expect.objectContaining({
                    architecture: expect.any(Number),
                    quality: expect.any(Number),
                    security: expect.any(Number),
                    performance: expect.any(Number)
                })
            });

            // Verify service calls
            expect(mockTaskAnalysisService.analyzeProject).toHaveBeenCalledWith(projectPath, options);
            expect(mockLayerValidationService.validateLayers).toHaveBeenCalledWith(projectPath, options);
            expect(mockLogicValidationService.validateLogic).toHaveBeenCalledWith(projectPath, options);

            // Verify logging
            expect(mockLogger.info).toHaveBeenCalledWith('Starting advanced analysis with layer and logic validation...');
            expect(mockLogger.info).toHaveBeenCalledWith('Phase 1: Performing standard analysis...');
            expect(mockLogger.info).toHaveBeenCalledWith('Phase 2: Performing layer validation...');
            expect(mockLogger.info).toHaveBeenCalledWith('Phase 3: Performing logic validation...');
            expect(mockLogger.info).toHaveBeenCalledWith('Phase 4: Generating integrated insights...');
            expect(mockLogger.info).toHaveBeenCalledWith('Phase 5: Generating comprehensive recommendations...');
            expect(mockLogger.info).toHaveBeenCalledWith('Phase 6: Calculating overall metrics...');
        });

        test('should handle analysis failures gracefully', async () => {
            const error = new Error('Analysis failed');
            mockTaskAnalysisService.analyzeProject.mockRejectedValue(error);

            const result = await service.performAdvancedAnalysis(projectPath, options);

            expect(result.overall).toBe(false);
            expect(result.error).toBe('Analysis failed');
            expect(mockLogger.error).toHaveBeenCalledWith('Advanced analysis failed:', error);
        });

        test('should handle partial analysis failures', async () => {
            const mockStandardAnalysis = {
                projectStructure: { type: 'nodejs', files: ['package.json'] }
            };

            const mockLayerValidation = {
                overall: false,
                violations: [{ type: 'boundary-violation', severity: 'high' }],
                metrics: { overallScore: 60 }
            };

            const mockLogicValidation = {
                overall: true,
                violations: [],
                metrics: { overallScore: 85 }
            };

            mockTaskAnalysisService.analyzeProject.mockResolvedValue(mockStandardAnalysis);
            mockLayerValidationService.validateLayers.mockResolvedValue(mockLayerValidation);
            mockLogicValidationService.validateLogic.mockResolvedValue(mockLogicValidation);

            const result = await service.performAdvancedAnalysis(projectPath, options);

            expect(result.overall).toBe(false); // Layer validation failed
            expect(result.layerValidation.overall).toBe(false);
            expect(result.logicValidation.overall).toBe(true);
        });

        test('should skip analysis phases when disabled', async () => {
            const optionsWithoutLayer = {
                includeLayerValidation: false,
                includeLogicValidation: true,
                includeStandardAnalysis: true
            };

            const mockStandardAnalysis = { projectStructure: { type: 'nodejs' } };
            const mockLogicValidation = {
                overall: true,
                violations: [],
                metrics: { overallScore: 85 }
            };

            mockTaskAnalysisService.analyzeProject.mockResolvedValue(mockStandardAnalysis);
            mockLogicValidationService.validateLogic.mockResolvedValue(mockLogicValidation);

            const result = await service.performAdvancedAnalysis(projectPath, optionsWithoutLayer);

            expect(mockLayerValidationService.validateLayers).not.toHaveBeenCalled();
            expect(result.layerValidation).toEqual({});
        });
    });

    describe('generateIntegratedInsights', () => {
        test('should generate cross-layer-logic insights', async () => {
            const analysis = {
                layerValidation: {
                    violations: [
                        { type: 'boundary-violation', file: 'src/ui/App.jsx', severity: 'high' }
                    ]
                },
                logicValidation: {
                    violations: [
                        { type: 'business-logic', file: 'src/ui/App.jsx', message: 'Business logic in UI layer' }
                    ]
                }
            };

            const insights = await service.generateIntegratedInsights(analysis);

            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'cross-layer-logic-issue',
                    severity: 'high',
                    title: 'Layer and Logic Violation Correlation',
                    description: expect.stringContaining('Layer violation in src/ui/App.jsx correlates with logic issue')
                })
            );
        });

        test('should detect business logic in wrong layers', async () => {
            const analysis = {
                layerValidation: {
                    layers: {
                        presentation: { files: ['src/ui/App.jsx'] },
                        infrastructure: { files: ['src/infrastructure/Database.js'] }
                    }
                },
                logicValidation: {
                    violations: [
                        { type: 'business-logic', file: 'src/ui/App.jsx', message: 'Business logic in UI' },
                        { type: 'business-logic', file: 'src/infrastructure/Database.js', message: 'Business logic in infrastructure' }
                    ]
                }
            };

            const insights = await service.generateIntegratedInsights(analysis);

            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'business-logic-placement',
                    severity: 'medium',
                    title: 'Business Logic in Wrong Layer',
                    description: 'Found 2 instances of business logic in inappropriate layers'
                })
            );
        });

        test('should analyze error handling patterns', async () => {
            const analysis = {
                logicValidation: {
                    errorHandling: {
                        metrics: { tryCatchBlocks: 0 },
                        patterns: []
                    }
                }
            };

            const insights = await service.generateIntegratedInsights(analysis);

            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'missing-error-handling',
                    severity: 'high',
                    title: 'Missing Error Handling',
                    description: 'No error handling detected across the codebase'
                })
            );
        });

        test('should analyze security patterns', async () => {
            const analysis = {
                logicValidation: {
                    security: {
                        metrics: { securityChecks: 0 },
                        violations: [
                            { type: 'sql-injection', severity: 'critical' }
                        ]
                    }
                }
            };

            const insights = await service.generateIntegratedInsights(analysis);

            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'missing-security',
                    severity: 'critical',
                    title: 'Missing Security Measures'
                })
            );

            expect(insights).toContainEqual(
                expect.objectContaining({
                    type: 'security-vulnerabilities',
                    severity: 'critical',
                    title: 'Security Vulnerabilities Detected'
                })
            );
        });
    });

    describe('areViolationsRelated', () => {
        test('should detect related violations in same file', () => {
            const layerViolation = { type: 'boundary-violation', file: 'src/ui/App.jsx' };
            const logicViolation = { type: 'business-logic', file: 'src/ui/App.jsx' };

            const result = service.areViolationsRelated(layerViolation, logicViolation);

            expect(result).toBe(true);
        });

        test('should detect related violations by pattern', () => {
            const layerViolation = { type: 'boundary-violation', file: 'src/domain/User.js' };
            const logicViolation = { type: 'business-logic', file: 'src/services/UserService.js' };

            const result = service.areViolationsRelated(layerViolation, logicViolation);

            expect(result).toBe(true);
        });

        test('should not detect unrelated violations', () => {
            const layerViolation = { type: 'boundary-violation', file: 'src/ui/App.jsx' };
            const logicViolation = { type: 'data-validation', file: 'src/utils/validator.js' };

            const result = service.areViolationsRelated(layerViolation, logicViolation);

            expect(result).toBe(false);
        });
    });

    describe('generateComprehensiveRecommendations', () => {
        test('should generate recommendations for critical violations', async () => {
            const analysis = {
                layerValidation: {
                    violations: [
                        { type: 'boundary-violation', severity: 'critical', file: 'src/ui/App.jsx' }
                    ]
                },
                logicValidation: {
                    violations: [
                        { type: 'security-vulnerability', severity: 'critical', file: 'src/auth/AuthService.js' }
                    ]
                }
            };

            const recommendations = await service.generateComprehensiveRecommendations(analysis);

            expect(recommendations).toContainEqual(
                expect.objectContaining({
                    priority: 'critical',
                    category: 'architecture',
                    title: 'Address Critical Violations',
                    description: 'Found 2 critical violations that must be addressed immediately'
                })
            );
        });

        test('should generate recommendations for high priority issues', async () => {
            const analysis = {
                layerValidation: {
                    violations: [
                        { type: 'import-violation', severity: 'high', file: 'src/services/UserService.js' }
                    ]
                },
                logicValidation: {
                    violations: [
                        { type: 'error-handling', severity: 'high', file: 'src/utils/helper.js' }
                    ]
                }
            };

            const recommendations = await service.generateComprehensiveRecommendations(analysis);

            expect(recommendations).toContainEqual(
                expect.objectContaining({
                    priority: 'high',
                    category: 'quality',
                    title: 'Address High Priority Issues',
                    description: 'Found 2 high priority issues that should be addressed soon'
                })
            );
        });

        test('should generate architectural improvement recommendations', async () => {
            const analysis = {
                layerValidation: {
                    recommendations: [
                        { title: 'Improve layer separation', description: 'Better separation needed' }
                    ]
                }
            };

            const recommendations = await service.generateComprehensiveRecommendations(analysis);

            expect(recommendations).toContainEqual(
                expect.objectContaining({
                    priority: 'medium',
                    category: 'architecture',
                    title: 'Architectural Improvements',
                    description: 'Several architectural improvements recommended'
                })
            );
        });
    });

    describe('calculateOverallMetrics', () => {
        test('should calculate overall metrics correctly', async () => {
            const analysis = {
                layerValidation: {
                    metrics: { overallScore: 90 }
                },
                logicValidation: {
                    metrics: { overallScore: 85 }
                },
                standardAnalysis: {
                    codeQuality: { issues: [] },
                    security: { vulnerabilities: [] },
                    performance: { issues: [] }
                }
            };

            const metrics = await service.calculateOverallMetrics(analysis);

            expect(metrics.overallScore).toBeGreaterThan(0);
            expect(metrics.overallScore).toBeLessThanOrEqual(100);
            expect(metrics.layerScore).toBe(90);
            expect(metrics.logicScore).toBe(85);
            expect(metrics.breakdown).toEqual({
                architecture: expect.any(Number),
                quality: expect.any(Number),
                security: expect.any(Number),
                performance: expect.any(Number)
            });
        });

        test('should handle missing metrics gracefully', async () => {
            const analysis = {
                layerValidation: {},
                logicValidation: {},
                standardAnalysis: {}
            };

            const metrics = await service.calculateOverallMetrics(analysis);

            expect(metrics.layerScore).toBe(0);
            expect(metrics.logicScore).toBe(0);
            expect(metrics.overallScore).toBeGreaterThanOrEqual(0);
        });
    });

    describe('calculateStandardScore', () => {
        test('should calculate standard score correctly', () => {
            const standardAnalysis = {
                codeQuality: { issues: [{ type: 'complexity' }] },
                security: { vulnerabilities: [{ type: 'sql-injection' }] },
                performance: { issues: [{ type: 'slow-query' }] }
            };

            const score = service.calculateStandardScore(standardAnalysis);

            // 100 - 5 (complexity) - 10 (security) - 3 (performance) = 82
            expect(score).toBe(82);
        });

        test('should not return negative score', () => {
            const standardAnalysis = {
                codeQuality: { issues: Array(25).fill({ type: 'complexity' }) }, // 25 * 5 = 125
                security: { vulnerabilities: [] },
                performance: { issues: [] }
            };

            const score = service.calculateStandardScore(standardAnalysis);

            expect(score).toBe(0);
        });
    });

    describe('calculateSecurityScore', () => {
        test('should calculate security score correctly', () => {
            const analysis = {
                logicValidation: {
                    security: {
                        violations: [
                            { severity: 'critical' },
                            { severity: 'high' },
                            { severity: 'medium' }
                        ],
                        metrics: { securityChecks: 5 }
                    }
                }
            };

            const score = service.calculateSecurityScore(analysis);

            // 100 - 20 (critical) - 10 (high) - 5 (medium) + 10 (security checks) = 75
            expect(score).toBe(75);
        });

        test('should cap security score at 100', () => {
            const analysis = {
                logicValidation: {
                    security: {
                        violations: [],
                        metrics: { securityChecks: 100 }
                    }
                }
            };

            const score = service.calculateSecurityScore(analysis);

            expect(score).toBe(100);
        });
    });

    describe('calculatePerformanceScore', () => {
        test('should calculate performance score correctly', () => {
            const analysis = {
                standardAnalysis: {
                    performance: {
                        bundleSize: 2000000, // 2MB
                        slowOperations: [{ type: 'database-query' }, { type: 'file-io' }]
                    }
                }
            };

            const score = service.calculatePerformanceScore(analysis);

            // 100 - 10 (large bundle) - 10 (2 slow operations) = 80
            expect(score).toBe(80);
        });

        test('should handle missing performance data', () => {
            const analysis = {
                standardAnalysis: {}
            };

            const score = service.calculatePerformanceScore(analysis);

            expect(score).toBe(100);
        });
    });

    describe('generateAnalysisReport', () => {
        test('should generate comprehensive analysis report', () => {
            const analysis = {
                projectPath: '/test/project',
                timestamp: new Date(),
                metrics: {
                    overallScore: 85,
                    breakdown: {
                        architecture: 90,
                        quality: 85,
                        security: 80,
                        performance: 75
                    }
                },
                layerValidation: {
                    overall: true,
                    violations: []
                },
                logicValidation: {
                    overall: true,
                    violations: [],
                    security: { violations: [] }
                },
                standardAnalysis: {
                    performance: { issues: [] }
                },
                integratedInsights: [
                    { type: 'cross-layer-logic-issue', severity: 'high' }
                ],
                recommendations: [
                    { priority: 'high', category: 'architecture' }
                ]
            };

            const report = service.generateAnalysisReport(analysis);

            expect(report.summary).toEqual({
                projectPath: '/test/project',
                timestamp: analysis.timestamp,
                overallScore: 85,
                overallValid: true,
                totalViolations: 0
            });

            expect(report.breakdown).toEqual({
                architecture: { score: 90, layerValidation: true, violations: 0 },
                quality: { score: 85, logicValidation: true, violations: 0 },
                security: { score: 80, violations: 0 },
                performance: { score: 75, issues: [] }
            });

            expect(report.insights).toEqual(analysis.integratedInsights);
            expect(report.recommendations).toEqual(analysis.recommendations);
            expect(report.details).toEqual({
                layerValidation: analysis.layerValidation,
                logicValidation: analysis.logicValidation,
                standardAnalysis: analysis.standardAnalysis
            });
        });
    });
}); 