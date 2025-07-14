const Logger = require('@logging/Logger');
const logger = new Logger('Logger');
/**
 * AnalysisController - API controller for specialized analysis endpoints
 */
class AnalysisController {
  constructor(codeQualityService, securityService, performanceService, architectureService, logger, analysisOutputService, analysisRepository) {
    this.codeQualityService = codeQualityService;
    this.securityService = securityService;
    this.performanceService = performanceService;
    this.architectureService = architectureService;
    this.logger = logger || { info: () => {}, error: () => {} };
    this.analysisOutputService = analysisOutputService;
    this.analysisRepository = analysisRepository;
  }

  /**
   * Analyze code quality
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeCodeQuality(req, res) {
    try {
      const { projectPath } = req.params;
      const options = req.body || {};

      this.logger.info(`[AnalysisController] Code quality analysis requested for: ${projectPath}`);

      const analysis = await this.codeQualityService.analyzeCodeQuality(projectPath, options);
      const score = this.codeQualityService.getQualityScore(analysis);
      const level = this.codeQualityService.getQualityLevel(score);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          summary: {
            overallScore: score,
            issues: analysis.issues.length,
            recommendations: analysis.recommendations.length,
            configuration: analysis.configuration
          }
        }
      });

    } catch (error) {
      this.logger.error(`[AnalysisController] Code quality analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Analyze security
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeSecurity(req, res) {
    try {
      const { projectPath } = req.params;
      const options = req.body || {};

      this.logger.info(`[AnalysisController] Security analysis requested for: ${projectPath}`);

      const analysis = await this.securityService.analyzeSecurity(projectPath, options);
      const score = this.securityService.getSecurityScore(analysis);
      const riskLevel = this.securityService.getOverallRiskLevel(analysis);
      const hasCriticalVulnerabilities = this.securityService.hasCriticalVulnerabilities(analysis);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          riskLevel,
          hasCriticalVulnerabilities,
          summary: this.securityService.getVulnerabilitySummary(analysis)
        }
      });

    } catch (error) {
      this.logger.error(`[AnalysisController] Security analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Analyze performance
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzePerformance(req, res) {
    try {
      const { projectPath } = req.params;
      const options = req.body || {};

      this.logger.info(`[AnalysisController] Performance analysis requested for: ${projectPath}`);

      const analysis = await this.performanceService.analyzePerformance(projectPath, options);
      const score = this.performanceService.getPerformanceScore(analysis);
      const level = this.performanceService.getPerformanceLevel(score);
      const criticalIssues = this.performanceService.getCriticalIssues(analysis);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          criticalIssues,
          summary: this.performanceService.getPerformanceSummary(analysis)
        }
      });

    } catch (error) {
      this.logger.error(`[AnalysisController] Performance analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Analyze architecture
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeArchitecture(req, res) {
    try {
      const { projectPath } = req.params;
      const options = req.body || {};

      this.logger.info(`[AnalysisController] Architecture analysis requested for: ${projectPath}`);

      const analysis = await this.architectureService.analyzeArchitecture(projectPath, options);
      const score = this.architectureService.getArchitectureScore(analysis);
      const level = this.architectureService.getArchitectureLevel(score);
      const isWellStructured = this.architectureService.isWellStructured(analysis);
      const hasCircularDependencies = this.architectureService.hasCircularDependencies(analysis);

      res.json({
        success: true,
        data: {
          analysis,
          score,
          level,
          isWellStructured,
          hasCircularDependencies,
          summary: this.architectureService.getArchitectureSummary(analysis)
        }
      });

    } catch (error) {
      this.logger.error(`[AnalysisController] Architecture analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Comprehensive analysis (all types)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async analyzeComprehensive(req, res) {
    try {
      const { projectPath } = req.params;
      const options = req.body || {};

      this.logger.info(`[AnalysisController] Comprehensive analysis requested for: ${projectPath}`);

      // Run all analyses in parallel
      const [codeQuality, security, performance, architecture] = await Promise.all([
        this.codeQualityService.analyzeCodeQuality(projectPath, options),
        this.securityService.analyzeSecurity(projectPath, options),
        this.performanceService.analyzePerformance(projectPath, options),
        this.architectureService.analyzeArchitecture(projectPath, options)
      ]);

      // Calculate overall scores
      const codeQualityScore = this.codeQualityService.getQualityScore(codeQuality);
      const securityScore = this.securityService.getSecurityScore(security);
      const performanceScore = this.performanceService.getPerformanceScore(performance);
      const architectureScore = this.architectureService.getArchitectureScore(architecture);

      // Calculate weighted overall score
      const overallScore = Math.round(
        (codeQualityScore * 0.25) +
        (securityScore * 0.30) +
        (performanceScore * 0.25) +
        (architectureScore * 0.20)
      );

      // Get critical issues from all analyses
      const criticalIssues = [
        ...this.performanceService.getCriticalIssues(performance),
        ...this.architectureService.getCriticalIssues(architecture)
      ];

      // Check for critical vulnerabilities
      if (this.securityService.hasCriticalVulnerabilities(security)) {
        criticalIssues.push({
          type: 'security-vulnerabilities',
          severity: 'critical',
          description: 'Critical security vulnerabilities detected',
          value: security.dependencies.critical
        });
      }

      res.json({
        success: true,
        data: {
          comprehensive: {
            overallScore,
            level: this.getOverallLevel(overallScore),
            criticalIssues,
            timestamp: new Date()
          },
          codeQuality: {
            analysis: codeQuality,
            score: codeQualityScore,
            level: this.codeQualityService.getQualityLevel(codeQualityScore)
          },
          security: {
            analysis: security,
            score: securityScore,
            riskLevel: this.securityService.getOverallRiskLevel(security)
          },
          performance: {
            analysis: performance,
            score: performanceScore,
            level: this.performanceService.getPerformanceLevel(performanceScore)
          },
          architecture: {
            analysis: architecture,
            score: architectureScore,
            level: this.architectureService.getArchitectureLevel(architectureScore)
          }
        }
      });

    } catch (error) {
      this.logger.error(`[AnalysisController] Comprehensive analysis failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get analysis status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisStatus(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis status for project: ${projectId}`);
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        // Return default status if no analyses exist
        const defaultStatus = {
          id: 'status',
          projectType: 'unknown',
          complexity: 'unknown',
          issues: [],
          suggestions: [],
          status: 'no-data',
          lastAnalysis: null,
          isRunning: false,
          progress: 0
        };
        
        res.json({ success: true, data: defaultStatus });
        return;
      }
      
      // Get the latest analysis
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Extract status information
      const projectType = summary.metadata?.projectType || 
                         resultData.techStack?.frameworks?.[0]?.name || 
                         'nodejs';
      
      const complexity = summary.metadata?.complexity || 
                        (resultData.codeQuality?.issues?.length > 100 ? 'high' : 
                         resultData.codeQuality?.issues?.length > 50 ? 'medium' : 'low');
      
      // Extract issues and suggestions
      const issues = [];
      const suggestions = [];
      
      if (resultData.codeQuality?.issues) {
        issues.push(...resultData.codeQuality.issues.slice(0, 5));
      }
      
      if (summary.recommendations && Array.isArray(summary.recommendations)) {
        suggestions.push(...summary.recommendations.slice(0, 5));
      }
      
      // Determine current status
      const isRunning = latestAnalysis.status === 'running';
      const progress = isRunning ? 50 : 
                      latestAnalysis.status === 'completed' ? 100 : 0;
      
      const status = {
        id: 'status',
        projectType,
        complexity,
        issues,
        suggestions,
        status: latestAnalysis.status,
        lastAnalysis: latestAnalysis.createdAt,
        isRunning,
        progress,
        projectId,
        analysisId: latestAnalysis.id,
        overallScore: summary.overallScore || 0,
        criticalIssues: summary.criticalIssues || 0,
        warnings: summary.warnings || 0,
        recommendations: summary.recommendations?.length || 0
      };
      
      this.logger.info(`[AnalysisController] Analysis status:`, status);
      
      res.json({ success: true, data: status });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis status:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisMetrics(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis metrics for project: ${projectId}`);
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      this.logger.info(`[AnalysisController] Found ${analyses.length} analyses for project ${projectId}`);
      
      if (analyses.length === 0) {
        // Return default metrics if no analyses exist
        const defaultMetrics = {
          id: 'metrics',
          projectType: 'unknown',
          complexity: 'unknown',
          issues: [],
          suggestions: [],
          totalAnalyses: 0,
          completedAnalyses: 0,
          failedAnalyses: 0,
          successRate: 0,
          averageDuration: 0,
          lastAnalysisDate: null,
          analysisTypes: {}
        };
        
        res.json({ success: true, data: defaultMetrics });
        return;
      }
      
      // Get the latest analysis for detailed metrics
      const latestAnalysis = analyses[0]; // Already sorted by created_at DESC
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Extract metrics from the latest analysis
      const projectType = summary.metadata?.projectType || 
                         resultData.techStack?.frameworks?.[0]?.name || 
                         'nodejs';
      
      const complexity = summary.metadata?.complexity || 
                        (resultData.codeQuality?.issues?.length > 100 ? 'high' : 
                         resultData.codeQuality?.issues?.length > 50 ? 'medium' : 'low');
      
      // Extract issues and suggestions from the analysis
      const issues = [];
      const suggestions = [];
      
      // Add code quality issues
      if (resultData.codeQuality?.issues) {
        issues.push(...resultData.codeQuality.issues.slice(0, 10)); // Limit to 10 most important
      }
      
      // Add security issues
      if (resultData.security?.vulnerabilities) {
        issues.push(...resultData.security.vulnerabilities.slice(0, 5));
      }
      
      // Add performance issues
      if (resultData.performance?.issues) {
        issues.push(...resultData.performance.issues.slice(0, 5));
      }
      
      // Add recommendations
      if (summary.recommendations && Array.isArray(summary.recommendations)) {
        suggestions.push(...summary.recommendations.slice(0, 10));
      }
      
      // Calculate basic metrics
      const totalAnalyses = analyses.length;
      const completedAnalyses = analyses.filter(a => a.status === 'completed').length;
      const failedAnalyses = analyses.filter(a => a.status === 'failed').length;
      const successRate = totalAnalyses > 0 ? completedAnalyses / totalAnalyses : 0;
      
      // Calculate average duration
      let totalDuration = 0;
      let durationCount = 0;
      analyses.forEach(analysis => {
        if (analysis.durationMs) {
          totalDuration += analysis.durationMs;
          durationCount++;
        }
      });
      const averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
      
      // Group by analysis type
      const analysisTypes = {};
      analyses.forEach(analysis => {
        const type = analysis.analysisType || 'unknown';
        analysisTypes[type] = (analysisTypes[type] || 0) + 1;
      });
      
      const metrics = {
        id: 'metrics',
        projectType,
        complexity,
        issues,
        suggestions,
        totalAnalyses,
        completedAnalyses,
        failedAnalyses,
        successRate,
        averageDuration,
        lastAnalysisDate: latestAnalysis.createdAt,
        analysisTypes,
        overallScore: summary.overallScore || 0,
        criticalIssues: summary.criticalIssues || 0,
        warnings: summary.warnings || 0,
        recommendations: summary.recommendations?.length || 0
      };
      
      this.logger.info(`[AnalysisController] Calculated metrics:`, metrics);
      
      res.json({ success: true, data: metrics });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis metrics:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis history
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisHistory(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis history for project: ${projectId}`);
      this.logger.info(`[AnalysisController] Request URL: ${req.url}`);
      this.logger.info(`[AnalysisController] Request method: ${req.method}`);
      this.logger.info(`[AnalysisController] AnalysisRepository type: ${this.analysisRepository.constructor.name}`);
      
      // Get analysis history from database
      this.logger.info(`[AnalysisController] Calling analysisRepository.findByProjectId('${projectId}')`);
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      this.logger.info(`[AnalysisController] Found ${analyses.length} analyses from repository:`, analyses);
      
      // Transform to expected format (array of objects)
      const history = analyses.map(analysis => {
        // Extract data from the analysis result
        const resultData = analysis.resultData || {};
        const summary = analysis.summary || {};
        
        // Determine analysis type for display
        const analysisType = analysis.analysisType || 'unknown';
        const displayType = analysisType === 'advanced-analysis' ? 'analysis' : analysisType;
        
        // Calculate file size from data (if available)
        const dataSize = JSON.stringify(resultData).length;
        
        // Get filename from metadata or generate one
        const filename = summary.metadata?.filename || 
                        summary.metadata?.projectPath?.split('/').pop() || 
                        `${analysisType}-${analysis.id}.json`;
        
        const transformedAnalysis = {
          id: analysis.id,
          projectId: analysis.projectId,
          analysisType: analysisType,
          type: displayType, // Frontend expects 'type' field
          timestamp: analysis.createdAt,
          status: analysis.status,
          data: resultData,
          report: summary,
          metadata: summary.metadata || {},
          // Frontend-specific fields
          filename: filename,
          size: dataSize,
          completed: analysis.status === 'completed',
          error: analysis.status === 'failed' ? 'Analysis failed' : null,
          progress: analysis.status === 'completed' ? 100 : 
                   analysis.status === 'running' ? 50 : 0
        };
        
        this.logger.info(`[AnalysisController] Transformed analysis:`, transformedAnalysis);
        return transformedAnalysis;
      });
      
      this.logger.info(`[AnalysisController] Final history response:`, { success: true, data: history });
      
      res.json({ success: true, data: history });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis history:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis file
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisFile(req, res) {
    try {
      const { projectId, filename } = req.params;
      const content = await this.analysisOutputService.getAnalysisFile(projectId, filename);
      res.json({ success: true, data: content });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis file:`, error);
      res.status(404).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis from database
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisFromDatabase(req, res) {
    try {
      const { projectId } = req.params;
      const { type } = req.query;
      
      let analyses;
      if (type) {
        analyses = await this.analysisRepository.findByProjectIdAndType(projectId, type);
      } else {
        analyses = await this.analysisRepository.findByProjectId(projectId);
      }
      
      res.json({ success: true, data: analyses });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis from database:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis issues
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisIssues(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis issues for project: ${projectId}`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { issues: [], summary: {} } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      
      // Extract issues from various analysis types
      const issues = [];
      
      // Code quality issues
      if (resultData.codeQuality?.issues) {
        issues.push(...resultData.codeQuality.issues.map(issue => ({
          ...issue,
          source: 'code-quality',
          category: 'code-quality'
        })));
      }
      
      // Security issues
      if (resultData.security?.vulnerabilities) {
        issues.push(...resultData.security.vulnerabilities.map(issue => ({
          ...issue,
          source: 'security',
          category: 'security'
        })));
      }
      
      // Architecture issues
      if (resultData.architecture?.violations) {
        issues.push(...resultData.architecture.violations.map(issue => ({
          ...issue,
          source: 'architecture',
          category: 'architecture'
        })));
      }
      
      // Layer validation issues
      if (resultData.layerValidation?.violations) {
        issues.push(...resultData.layerValidation.violations.map(issue => ({
          ...issue,
          source: 'layer-validation',
          category: 'architecture'
        })));
      }
      
      // Logic validation issues
      if (resultData.logicValidation?.violations) {
        issues.push(...resultData.logicValidation.violations.map(issue => ({
          ...issue,
          source: 'logic-validation',
          category: 'logic'
        })));
      }
      
      // Sort by severity
      issues.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4);
      });
      
      const summary = {
        total: issues.length,
        bySeverity: {
          critical: issues.filter(i => i.severity === 'critical').length,
          high: issues.filter(i => i.severity === 'high').length,
          medium: issues.filter(i => i.severity === 'medium').length,
          low: issues.filter(i => i.severity === 'low').length
        },
        byCategory: {
          'code-quality': issues.filter(i => i.category === 'code-quality').length,
          security: issues.filter(i => i.category === 'security').length,
          architecture: issues.filter(i => i.category === 'architecture').length,
          logic: issues.filter(i => i.category === 'logic').length
        }
      };
      
      res.json({ success: true, data: { issues, summary } });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis issues:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis tech stack
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisTechStack(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis tech stack for project: ${projectId}`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { dependencies: {}, structure: {} } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      
      // Extract tech stack information
      const techStack = {
        dependencies: {
          direct: resultData.dependencies?.direct || {},
          dev: resultData.dependencies?.dev || {},
          outdated: resultData.dependencies?.outdated || []
        },
        structure: {
          projectType: resultData.structure?.projectType || 'unknown',
          fileTypes: resultData.structure?.fileTypes || {},
          frameworks: resultData.techStack?.frameworks || [],
          libraries: resultData.techStack?.libraries || []
        }
      };
      
      res.json({ success: true, data: techStack });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis tech stack:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis architecture
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisArchitecture(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis architecture for project: ${projectId}`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { structure: {}, dependencies: {}, metrics: {} } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      
      // Extract architecture information
      const architecture = {
        structure: {
          layers: resultData.architecture?.layers || 0,
          modules: resultData.architecture?.modules || 0,
          patterns: resultData.architecture?.patterns || []
        },
        dependencies: {
          circular: resultData.architecture?.circularDependencies || false,
          count: resultData.architecture?.dependencyCount || 0,
          graph: resultData.architecture?.dependencyGraph || null
        },
        metrics: {
          coupling: resultData.architecture?.coupling || 'unknown',
          cohesion: resultData.architecture?.cohesion || 'unknown',
          complexity: resultData.architecture?.complexity || 'unknown'
        }
      };
      
      res.json({ success: true, data: architecture });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis architecture:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis recommendations
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisRecommendations(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`[AnalysisController] Getting analysis recommendations for project: ${projectId}`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { recommendations: [], insights: [] } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      const summary = latestAnalysis.summary || {};
      
      // Extract recommendations from various sources
      const recommendations = [];
      
      // Code quality recommendations
      if (resultData.codeQuality?.recommendations) {
        recommendations.push(...resultData.codeQuality.recommendations.map(rec => ({
          ...rec,
          source: 'code-quality',
          category: 'code-quality'
        })));
      }
      
      // Security recommendations
      if (resultData.security?.recommendations) {
        recommendations.push(...resultData.security.recommendations.map(rec => ({
          ...rec,
          source: 'security',
          category: 'security'
        })));
      }
      
      // Architecture recommendations
      if (resultData.architecture?.recommendations) {
        recommendations.push(...resultData.architecture.recommendations.map(rec => ({
          ...rec,
          source: 'architecture',
          category: 'architecture'
        })));
      }
      
      // Summary recommendations
      if (summary.recommendations) {
        recommendations.push(...summary.recommendations.map(rec => ({
          ...rec,
          source: 'summary',
          category: rec.category || 'general'
        })));
      }
      
      // Sort by priority
      recommendations.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
      });
      
      // Extract insights
      const insights = [];
      if (resultData.integratedInsights) {
        insights.push(...resultData.integratedInsights);
      }
      
      res.json({ success: true, data: { recommendations, insights } });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to get analysis recommendations:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Generate comprehensive report
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async generateComprehensiveReport(req, res) {
    try {
      const { projectId } = req.params;
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      // Group by type and get latest
      const latestAnalyses = {};
      analyses.forEach(analysis => {
        if (!latestAnalyses[analysis.analysisType] || 
            new Date(analysis.timestamp) > new Date(latestAnalyses[analysis.analysisType].timestamp)) {
          latestAnalyses[analysis.analysisType] = analysis;
        }
      });
      
      // Generate markdown report
      const reportResult = await this.analysisOutputService.generateMarkdownReport(
        projectId, 
        latestAnalyses
      );
      
      res.json({ 
        success: true, 
        data: {
          reportFile: reportResult.filename,
          reportPath: reportResult.filepath,
          analyses: Object.keys(latestAnalyses)
        }
      });
    } catch (error) {
      this.logger.error(`[AnalysisController] Failed to generate comprehensive report:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get overall level based on score
   * @param {number} score - Overall score
   * @returns {string} Overall level
   */
  getOverallLevel(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }
}

module.exports = AnalysisController; 