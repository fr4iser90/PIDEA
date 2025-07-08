/**
 * Unit tests for TaskAnalysisService
 */
const TaskAnalysisService = require('../../../domain/services/TaskAnalysisService');
const ProjectType = require('../../../domain/value-objects/ProjectType');

// Mock dependencies
jest.mock('@/infrastructure/external/AIService');
jest.mock('@/infrastructure/external/ProjectAnalyzer');

describe('TaskAnalysisService', () => {
    let taskAnalysisService;
    let mockAIService;
    let mockProjectAnalyzer;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create mock instances
        mockAIService = {
            analyzeProject: jest.fn(),
            generateInsights: jest.fn(),
            generateRecommendations: jest.fn(),
            performSecurityAnalysis: jest.fn(),
            analyzePerformance: jest.fn()
        };

        mockProjectAnalyzer = {
            analyzeStructure: jest.fn(),
            detectPatterns: jest.fn(),
            identifyDependencies: jest.fn(),
            analyzeCodeQuality: jest.fn()
        };

        // Create service instance with mocked dependencies
        taskAnalysisService = new TaskAnalysisService({
            aiService: mockAIService,
            projectAnalyzer: mockProjectAnalyzer
        });
    });

    describe('Project Analysis', () => {
        test('should perform full project analysis', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true, analysisType: 'full' };

            const mockStructure = {
                type: 'nodejs',
                files: ['package.json', 'src/index.js'],
                dependencies: { express: '^4.17.1' }
            };

            const mockAIInsights = [
                'Project uses modern JavaScript features',
                'Good separation of concerns in code structure'
            ];

            const mockRecommendations = [
                {
                    title: 'Add TypeScript',
                    description: 'Consider migrating to TypeScript for better type safety',
                    priority: 'medium'
                }
            ];

            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);
            mockAIService.generateInsights.mockResolvedValue(mockAIInsights);
            mockAIService.generateRecommendations.mockResolvedValue(mockRecommendations);

            const result = await taskAnalysisService.analyzeProject(projectPath, options);

            expect(mockProjectAnalyzer.analyzeStructure).toHaveBeenCalledWith(projectPath);
            expect(mockAIService.generateInsights).toHaveBeenCalledWith(mockStructure, options);
            expect(mockAIService.generateRecommendations).toHaveBeenCalledWith(mockStructure, options);

            expect(result).toEqual({
                projectStructure: mockStructure,
                insights: mockAIInsights,
                recommendations: mockRecommendations,
                analysisType: 'full',
                timestamp: expect.any(Date)
            });
        });

        test('should perform analysis without AI when disabled', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: false, analysisType: 'structure' };

            const mockStructure = {
                type: 'nodejs',
                files: ['package.json', 'src/index.js'],
                dependencies: { express: '^4.17.1' }
            };

            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);

            const result = await taskAnalysisService.analyzeProject(projectPath, options);

            expect(mockProjectAnalyzer.analyzeStructure).toHaveBeenCalledWith(projectPath);
            expect(mockAIService.generateInsights).not.toHaveBeenCalled();
            expect(mockAIService.generateRecommendations).not.toHaveBeenCalled();

            expect(result).toEqual({
                projectStructure: mockStructure,
                insights: [],
                recommendations: [],
                analysisType: 'structure',
                timestamp: expect.any(Date)
            });
        });

        test('should handle analysis errors gracefully', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            mockProjectAnalyzer.analyzeStructure.mockRejectedValue(new Error('Analysis failed'));

            await expect(taskAnalysisService.analyzeProject(projectPath, options))
                .rejects.toThrow('Analysis failed');
        });
    });

    describe('Code Quality Analysis', () => {
        test('should analyze code quality', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            const mockQualityReport = {
                score: 85,
                issues: [
                    { type: 'complexity', message: 'Function is too complex', file: 'src/utils.js', line: 15 },
                    { type: 'duplication', message: 'Code duplication detected', file: 'src/helpers.js', line: 23 }
                ],
                suggestions: [
                    'Refactor complex functions into smaller ones',
                    'Extract common code into utility functions'
                ]
            };

            mockProjectAnalyzer.analyzeCodeQuality.mockResolvedValue(mockQualityReport);

            const result = await taskAnalysisService.analyzeCodeQuality(projectPath, options);

            expect(mockProjectAnalyzer.analyzeCodeQuality).toHaveBeenCalledWith(projectPath);
            expect(result).toEqual(mockQualityReport);
        });

        test('should generate AI-powered quality improvements', async () => {
            const qualityReport = {
                score: 75,
                issues: [
                    { type: 'complexity', message: 'Function is too complex', file: 'src/utils.js', line: 15 }
                ]
            };

            const mockImprovements = [
                'Break down the complex function into smaller, focused functions',
                'Use early returns to reduce nesting',
                'Extract magic numbers into named constants'
            ];

            mockAIService.generateInsights.mockResolvedValue(mockImprovements);

            const result = await taskAnalysisService.generateQualityImprovements(qualityReport);

            expect(mockAIService.generateInsights).toHaveBeenCalledWith(qualityReport, {
                context: 'code-quality-improvement'
            });
            expect(result).toEqual(mockImprovements);
        });
    });

    describe('Security Analysis', () => {
        test('should perform security analysis', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            const mockSecurityReport = {
                vulnerabilities: [
                    {
                        type: 'dependency',
                        severity: 'high',
                        description: 'Outdated package with known vulnerability',
                        package: 'lodash',
                        version: '4.17.15',
                        fix: 'Update to version 4.17.21'
                    }
                ],
                recommendations: [
                    'Update all dependencies to latest versions',
                    'Enable automated security scanning in CI/CD'
                ]
            };

            mockAIService.performSecurityAnalysis.mockResolvedValue(mockSecurityReport);

            const result = await taskAnalysisService.analyzeSecurity(projectPath, options);

            expect(mockAIService.performSecurityAnalysis).toHaveBeenCalledWith(
                expect.objectContaining({ projectPath }),
                options
            );
            expect(result).toEqual(mockSecurityReport);
        });

        test('should generate security fixes', async () => {
            const securityReport = {
                vulnerabilities: [
                    {
                        type: 'dependency',
                        severity: 'high',
                        description: 'Outdated package',
                        fix: 'Update package'
                    }
                ]
            };

            const mockFixes = [
                'Run npm audit fix to automatically fix vulnerabilities',
                'Update package.json with latest secure versions'
            ];

            mockAIService.generateRecommendations.mockResolvedValue(mockFixes);

            const result = await taskAnalysisService.generateSecurityFixes(securityReport);

            expect(mockAIService.generateRecommendations).toHaveBeenCalledWith(securityReport, {
                context: 'security-fixes'
            });
            expect(result).toEqual(mockFixes);
        });
    });

    describe('Performance Analysis', () => {
        test('should analyze performance', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            const mockPerformanceReport = {
                metrics: {
                    bundleSize: '2.5MB',
                    loadTime: '3.2s',
                    memoryUsage: '45MB'
                },
                bottlenecks: [
                    'Large bundle size due to unused dependencies',
                    'Slow database queries in user service'
                ],
                recommendations: [
                    'Implement code splitting',
                    'Add database query optimization'
                ]
            };

            mockAIService.analyzePerformance.mockResolvedValue(mockPerformanceReport);

            const result = await taskAnalysisService.analyzePerformance(projectPath, options);

            expect(mockAIService.analyzePerformance).toHaveBeenCalledWith(
                expect.objectContaining({ projectPath }),
                options
            );
            expect(result).toEqual(mockPerformanceReport);
        });

        test('should generate performance optimizations', async () => {
            const performanceReport = {
                bottlenecks: [
                    'Large bundle size due to unused dependencies'
                ]
            };

            const mockOptimizations = [
                'Remove unused dependencies from package.json',
                'Implement tree shaking in webpack configuration',
                'Use dynamic imports for code splitting'
            ];

            mockAIService.generateRecommendations.mockResolvedValue(mockOptimizations);

            const result = await taskAnalysisService.generatePerformanceOptimizations(performanceReport);

            expect(mockAIService.generateRecommendations).toHaveBeenCalledWith(performanceReport, {
                context: 'performance-optimization'
            });
            expect(result).toEqual(mockOptimizations);
        });
    });

    describe('Architecture Analysis', () => {
        test('should analyze architecture patterns', async () => {
            const projectPath = '/test/project';

            const mockArchitectureReport = {
                patterns: ['mvc', 'repository', 'factory'],
                layers: ['presentation', 'business', 'data'],
                coupling: 'low',
                cohesion: 'high',
                recommendations: [
                    'Consider implementing CQRS pattern for better separation',
                    'Add interface segregation for better modularity'
                ]
            };

            mockProjectAnalyzer.detectPatterns.mockResolvedValue(mockArchitectureReport);

            const result = await taskAnalysisService.analyzeArchitecture(projectPath);

            expect(mockProjectAnalyzer.detectPatterns).toHaveBeenCalledWith(projectPath);
            expect(result).toEqual(mockArchitectureReport);
        });

        test('should generate architecture improvements', async () => {
            const architectureReport = {
                patterns: ['mvc'],
                coupling: 'medium',
                cohesion: 'medium'
            };

            const mockImprovements = [
                'Implement dependency injection for better testability',
                'Add service layer for business logic separation',
                'Use repository pattern for data access'
            ];

            mockAIService.generateRecommendations.mockResolvedValue(mockImprovements);

            const result = await taskAnalysisService.generateArchitectureImprovements(architectureReport);

            expect(mockAIService.generateRecommendations).toHaveBeenCalledWith(architectureReport, {
                context: 'architecture-improvement'
            });
            expect(result).toEqual(mockImprovements);
        });
    });

    describe('Dependency Analysis', () => {
        test('should analyze project dependencies', async () => {
            const projectPath = '/test/project';

            const mockDependencyReport = {
                direct: { express: '^4.17.1', lodash: '^4.17.21' },
                dev: { jest: '^27.0.0', eslint: '^8.0.0' },
                outdated: ['lodash'],
                vulnerabilities: ['express'],
                recommendations: [
                    'Update lodash to latest version',
                    'Replace express with fastify for better performance'
                ]
            };

            mockProjectAnalyzer.identifyDependencies.mockResolvedValue(mockDependencyReport);

            const result = await taskAnalysisService.analyzeDependencies(projectPath);

            expect(mockProjectAnalyzer.identifyDependencies).toHaveBeenCalledWith(projectPath);
            expect(result).toEqual(mockDependencyReport);
        });

        test('should generate dependency recommendations', async () => {
            const dependencyReport = {
                outdated: ['lodash'],
                vulnerabilities: ['express']
            };

            const mockRecommendations = [
                'Run npm update to update outdated packages',
                'Run npm audit fix to fix vulnerabilities',
                'Consider using yarn for better dependency management'
            ];

            mockAIService.generateRecommendations.mockResolvedValue(mockRecommendations);

            const result = await taskAnalysisService.generateDependencyRecommendations(dependencyReport);

            expect(mockAIService.generateRecommendations).toHaveBeenCalledWith(dependencyReport, {
                context: 'dependency-management'
            });
            expect(result).toEqual(mockRecommendations);
        });
    });

    describe('Comprehensive Analysis', () => {
        test('should perform comprehensive analysis with all aspects', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true, analysisType: 'comprehensive' };

            // Mock all analysis methods
            const mockStructure = { type: 'nodejs', files: ['package.json'] };
            const mockQuality = { score: 85, issues: [] };
            const mockSecurity = { vulnerabilities: [], recommendations: [] };
            const mockPerformance = { metrics: {}, bottlenecks: [] };
            const mockArchitecture = { patterns: ['mvc'], coupling: 'low' };
            const mockDependencies = { direct: {}, dev: {}, outdated: [] };

            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);
            mockProjectAnalyzer.analyzeCodeQuality.mockResolvedValue(mockQuality);
            mockAIService.performSecurityAnalysis.mockResolvedValue(mockSecurity);
            mockAIService.analyzePerformance.mockResolvedValue(mockPerformance);
            mockProjectAnalyzer.detectPatterns.mockResolvedValue(mockArchitecture);
            mockProjectAnalyzer.identifyDependencies.mockResolvedValue(mockDependencies);

            const result = await taskAnalysisService.performComprehensiveAnalysis(projectPath, options);

            expect(result).toEqual({
                projectStructure: mockStructure,
                codeQuality: mockQuality,
                security: mockSecurity,
                performance: mockPerformance,
                architecture: mockArchitecture,
                dependencies: mockDependencies,
                analysisType: 'comprehensive',
                timestamp: expect.any(Date)
            });
        });

        test('should handle partial analysis failures gracefully', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true, analysisType: 'comprehensive' };

            // Mock some successful and some failed analyses
            const mockStructure = { type: 'nodejs', files: ['package.json'] };
            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);
            mockProjectAnalyzer.analyzeCodeQuality.mockRejectedValue(new Error('Quality analysis failed'));

            const result = await taskAnalysisService.performComprehensiveAnalysis(projectPath, options);

            expect(result.projectStructure).toEqual(mockStructure);
            expect(result.codeQuality).toEqual({ error: 'Quality analysis failed' });
            expect(result.analysisType).toBe('comprehensive');
        });
    });

    describe('Analysis Caching', () => {
        test('should cache analysis results', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            const mockStructure = { type: 'nodejs', files: ['package.json'] };
            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);

            // First call should perform analysis
            const result1 = await taskAnalysisService.analyzeProject(projectPath, options);
            
            // Second call should use cache
            const result2 = await taskAnalysisService.analyzeProject(projectPath, options);

            expect(mockProjectAnalyzer.analyzeStructure).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        });

        test('should respect cache invalidation', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true, forceRefresh: true };

            const mockStructure = { type: 'nodejs', files: ['package.json'] };
            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);

            // Both calls should perform analysis due to forceRefresh
            await taskAnalysisService.analyzeProject(projectPath, options);
            await taskAnalysisService.analyzeProject(projectPath, options);

            expect(mockProjectAnalyzer.analyzeStructure).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling', () => {
        test('should handle AI service errors gracefully', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            const mockStructure = { type: 'nodejs', files: ['package.json'] };
            mockProjectAnalyzer.analyzeStructure.mockResolvedValue(mockStructure);
            mockAIService.generateInsights.mockRejectedValue(new Error('AI service unavailable'));

            const result = await taskAnalysisService.analyzeProject(projectPath, options);

            expect(result.projectStructure).toEqual(mockStructure);
            expect(result.insights).toEqual([]);
            expect(result.error).toContain('AI service unavailable');
        });

        test('should handle project analyzer errors gracefully', async () => {
            const projectPath = '/test/project';
            const options = { includeAI: true };

            mockProjectAnalyzer.analyzeStructure.mockRejectedValue(new Error('Project not found'));

            await expect(taskAnalysisService.analyzeProject(projectPath, options))
                .rejects.toThrow('Project not found');
        });
    });
}); 