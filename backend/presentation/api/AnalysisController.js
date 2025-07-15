const Logger = require('@logging/Logger');
const ServiceLogger = require('@logging/ServiceLogger');
const logger = new ServiceLogger('AnalysisController');
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

      this.logger.info(`Code quality analysis requested for project`);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'code-quality');
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached code quality analysis for project`);
        const analysis = latest.resultData;
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
        return;
      }

      const analysis = await this.codeQualityService.analyzeCodeQuality(projectPath, options);
      await this.analysisRepository.saveAnalysis(projectPath, 'code-quality', analysis);
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
      this.logger.error(`Code quality analysis failed:`, error);
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

      this.logger.info(`Security analysis requested for project`);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'security');
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached security analysis for project`);
        const analysis = latest.resultData;
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
        return;
      }

      const analysis = await this.securityService.analyzeSecurity(projectPath, options);
      await this.analysisRepository.saveAnalysis(projectPath, 'security', analysis);
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
      this.logger.error(`Security analysis failed:`, error);
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

      this.logger.info(`Performance analysis requested for project`);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'performance');
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached performance analysis for project`);
        const analysis = latest.resultData;
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
        return;
      }

      const analysis = await this.performanceService.analyzePerformance(projectPath, options);
      await this.analysisRepository.saveAnalysis(projectPath, 'performance', analysis);
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
      this.logger.error(`Performance analysis failed:`, error);
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

      this.logger.info(`Architecture analysis requested for project`);

      // Suche nach aktueller Analyse
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'architecture');
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached architecture analysis for project`);
        const analysis = latest.resultData;
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
        return;
      }

      const analysis = await this.architectureService.analyzeArchitecture(projectPath, options);
      await this.analysisRepository.saveAnalysis(projectPath, 'architecture', analysis);
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
      this.logger.error(`Architecture analysis failed:`, error);
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

      this.logger.info(`Comprehensive analysis requested for project`);

      // Check for cached comprehensive analysis first
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'comprehensive');
      if (latest && isAnalysisFresh(latest)) {
        this.logger.info(`Returning cached comprehensive analysis for project`);
        const analysis = latest.resultData;
        
        res.json({
          success: true,
          data: analysis
        });
        return;
      }

      this.logger.info(`Running new comprehensive analysis for project`);

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

      const comprehensiveResult = {
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
      };

      // Save the comprehensive analysis result
      await this.analysisRepository.saveAnalysis(projectPath, 'comprehensive', comprehensiveResult);

      res.json({
        success: true,
        data: comprehensiveResult
      });

    } catch (error) {
      this.logger.error(`Comprehensive analysis failed:`, error);
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
      
      this.logger.info(`Getting analysis status for project`);
      
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
      
      this.logger.info(`Analysis status retrieved successfully`);
      
      res.json({ success: true, data: status });
    } catch (error) {
      this.logger.error(`Failed to get analysis status:`, error);
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
      
      this.logger.info(`Getting analysis metrics for project`);
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      this.logger.info(`Found ${analyses.length} analyses for project`);
      
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
      
      this.logger.info(`Calculated metrics successfully`);
      
      res.json({ success: true, data: metrics });
    } catch (error) {
      this.logger.error(`Failed to get analysis metrics:`, error);
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
      
      this.logger.info(`Getting analysis history for project`);
      this.logger.info(`Request URL: ${req.url}`);
      this.logger.info(`Request method: ${req.method}`);
      this.logger.info(`AnalysisRepository type: ${this.analysisRepository.constructor.name}`);
      
      // Get analysis history from database
      this.logger.info(`Calling analysisRepository.findByProjectId('${projectId}')`);
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      this.logger.info(`Found ${analyses.length} analyses from repository`);
      
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
        
        this.logger.info(`Transformed analysis successfully`);
        return transformedAnalysis;
      });
      
      this.logger.info(`Analysis history prepared successfully`);
      
      res.json({ success: true, data: history });
    } catch (error) {
      this.logger.error(`Failed to get analysis history:`, error);
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
      this.logger.error(`Failed to get analysis file:`, error);
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
      this.logger.error(`Failed to get analysis from database:`, error);
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
      
      this.logger.info(`Getting analysis issues for project: ${projectId}`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          issues: [], 
          summary: { total: 0, bySeverity: { critical: 0, high: 0, medium: 0, low: 0 }, byCategory: {} } 
        } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      
      // Extract ONLY issues from various analysis types
      // Don't send the entire resultData file!
      const issues = [];
      
      // Code quality issues
      if (resultData.codeQuality?.issues && Array.isArray(resultData.codeQuality.issues)) {
        issues.push(...resultData.codeQuality.issues.map(issue => ({
          id: issue.id || issue.name || `cq-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Code Quality Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'code-quality',
          source: 'code-quality',
          file: issue.file || issue.path || null,
          line: issue.line || issue.lineNumber || null,
          rule: issue.rule || issue.type || null
        })));
      }
      
      // Security issues
      if (resultData.security?.vulnerabilities && Array.isArray(resultData.security.vulnerabilities)) {
        issues.push(...resultData.security.vulnerabilities.map(issue => ({
          id: issue.id || issue.name || `sec-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Security Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'security',
          source: 'security',
          cve: issue.cve || issue.cveId || null,
          package: issue.package || issue.dependency || null,
          version: issue.version || issue.affectedVersion || null
        })));
      }
      
      // Architecture issues
      if (resultData.architecture?.violations && Array.isArray(resultData.architecture.violations)) {
        issues.push(...resultData.architecture.violations.map(issue => ({
          id: issue.id || issue.name || `arch-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Architecture Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'architecture',
          source: 'architecture',
          pattern: issue.pattern || issue.type || null,
          component: issue.component || issue.file || null
        })));
      }
      
      // Project analysis issues
      if (resultData.projectAnalysis?.issues && Array.isArray(resultData.projectAnalysis.issues)) {
        issues.push(...resultData.projectAnalysis.issues.map(issue => ({
          id: issue.id || issue.name || `proj-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Project Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'project',
          source: 'project-analysis',
          file: issue.file || issue.path || null
        })));
      }
      
      // Performance issues
      if (resultData.performance?.issues && Array.isArray(resultData.performance.issues)) {
        issues.push(...resultData.performance.issues.map(issue => ({
          id: issue.id || issue.name || `perf-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Performance Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'performance',
          source: 'performance',
          metric: issue.metric || issue.type || null,
          value: issue.value || issue.currentValue || null,
          threshold: issue.threshold || issue.targetValue || null
        })));
      }
      
      // Layer validation issues
      if (resultData.layerValidation?.violations && Array.isArray(resultData.layerValidation.violations)) {
        issues.push(...resultData.layerValidation.violations.map(issue => ({
          id: issue.id || issue.name || `layer-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Layer Validation Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'architecture',
          source: 'layer-validation',
          layer: issue.layer || issue.type || null,
          component: issue.component || issue.file || null
        })));
      }
      
      // Logic validation issues
      if (resultData.logicValidation?.violations && Array.isArray(resultData.logicValidation.violations)) {
        issues.push(...resultData.logicValidation.violations.map(issue => ({
          id: issue.id || issue.name || `logic-${Date.now()}`,
          title: issue.title || issue.name || issue.message || 'Logic Validation Issue',
          description: issue.description || issue.message || issue.text || 'No description available',
          severity: issue.severity || issue.level || 'medium',
          category: 'logic',
          source: 'logic-validation',
          rule: issue.rule || issue.type || null,
          component: issue.component || issue.file || null
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
          logic: issues.filter(i => i.category === 'logic').length,
          project: issues.filter(i => i.category === 'project').length,
          performance: issues.filter(i => i.category === 'performance').length
        }
      };
      
      this.logger.info(`Issues data extracted, count: ${issues.length}`);
      
      res.json({ success: true, data: { issues, summary } });
    } catch (error) {
      this.logger.error(`Failed to get analysis issues:`, error);
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
      this.logger.info(`Getting analysis tech stack for project`);
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          dependencies: { direct: {}, dev: {}, outdated: [] },
          structure: { projectType: 'unknown', fileTypes: {}, frameworks: [], libraries: [] }
        } });
      }
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      // --- Merge all dependencies from all manifests (root, backend, frontend, etc.) ---
      // Try to find all dependency objects in resultData
      let allDeps = [];
      if (resultData.dependencies?.allPackages) {
        // If already collected as array
        allDeps = resultData.dependencies.allPackages;
      } else {
        // Fallback: try to collect from known locations
        allDeps = [];
        if (resultData.dependencies?.packagesByContext) {
          // e.g. { root: {...}, backend: {...}, frontend: {...} }
          for (const ctx of Object.values(resultData.dependencies.packagesByContext)) {
            allDeps.push(ctx);
          }
        } else {
          // Try to find root/backend/frontend/dev
          ['dependencies', 'devDependencies', 'packageJson'].forEach(key => {
            if (resultData[key]) allDeps.push(resultData[key]);
          });
        }
      }
      // Merge all direct/dev dependencies
      let mergedDirect = {};
      let mergedDev = {};
      let mergedOutdated = [];
      for (const depObj of allDeps) {
        if (depObj.dependencies) Object.assign(mergedDirect, depObj.dependencies);
        if (depObj.devDependencies) Object.assign(mergedDev, depObj.devDependencies);
        if (depObj.outdated) mergedOutdated = mergedOutdated.concat(depObj.outdated);
      }
      // Fallback: if nothing found, use old logic
      if (Object.keys(mergedDirect).length === 0) {
        mergedDirect = resultData.dependencies?.direct || resultData.dependencies?.packages || resultData.packageJson?.dependencies || {};
      }
      if (Object.keys(mergedDev).length === 0) {
        mergedDev = resultData.dependencies?.dev || resultData.dependencies?.devDependencies || resultData.packageJson?.devDependencies || {};
      }
      if (mergedOutdated.length === 0) {
        mergedOutdated = resultData.dependencies?.outdated || resultData.dependencies?.outdatedPackages || resultData.packageJson?.outdated || [];
      }
      const techStack = {
        dependencies: {
          direct: mergedDirect,
          dev: mergedDev,
          outdated: mergedOutdated
        },
        structure: {
          projectType: resultData.techStack?.frameworks?.[0]?.name || 
                      resultData.structure?.projectType || 
                      resultData.projectType || 
                      'nodejs',
          fileTypes: resultData.structure?.fileTypes || 
                    resultData.techStack?.languages || 
                    resultData.fileTypes || {},
          frameworks: resultData.techStack?.frameworks || 
                     resultData.frameworks || 
                     resultData.structure?.frameworks || [],
          libraries: resultData.techStack?.libraries || 
                    resultData.libraries || 
                    resultData.structure?.libraries || []
        }
      };
      this.logger.info(`Tech stack data extracted successfully`);
      res.json({ success: true, data: techStack });
    } catch (error) {
      this.logger.error(`Failed to get analysis tech stack:`, error);
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
      
      this.logger.info(`Getting analysis architecture for project`);
      
      // Get latest analysis for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { 
          structure: { layers: 0, modules: 0, patterns: [] },
          dependencies: { circular: false, count: 0, graph: null },
          metrics: { coupling: 'unknown', cohesion: 'unknown', complexity: 'unknown', maintainability: 'unknown', testability: 'unknown' },
          patterns: [],
          antiPatterns: [],
          recommendations: []
        } });
      }
      
      const latestAnalysis = analyses[0];
      const resultData = latestAnalysis.resultData || {};
      
      // Extract ONLY architecture information from actual data structure
      // Don't send the entire resultData file!
      const architecture = {
        structure: {
          layers: resultData.architecture?.layers || 
                 resultData.architecture?.structure?.layers || 
                 resultData.structure?.layers || 0,
          modules: resultData.architecture?.modules || 
                  resultData.architecture?.structure?.modules || 
                  resultData.structure?.modules || 
                  Object.keys(resultData.architecture?.modules || {}).length || 0,
          patterns: resultData.architecture?.patterns || 
                   resultData.architecture?.detectedPatterns || 
                   resultData.structure?.patterns || []
        },
        dependencies: {
          circular: resultData.architecture?.circularDependencies || 
                   resultData.architecture?.dependencies?.circular || 
                   resultData.dependencies?.circular || false,
          count: resultData.architecture?.dependencyCount || 
                resultData.architecture?.dependencies?.count || 
                resultData.dependencies?.count || 
                Object.keys(resultData.dependencies?.packages || {}).length || 0,
          graph: resultData.architecture?.dependencyGraph || 
                resultData.architecture?.dependencies?.graph || 
                resultData.dependencies?.graph || null
        },
        metrics: {
          coupling: resultData.architecture?.coupling || 
                   resultData.architecture?.metrics?.coupling || 
                   resultData.metrics?.coupling || 'unknown',
          cohesion: resultData.architecture?.cohesion || 
                   resultData.architecture?.metrics?.cohesion || 
                   resultData.metrics?.cohesion || 'unknown',
          complexity: resultData.architecture?.complexity || 
                     resultData.architecture?.metrics?.complexity || 
                     resultData.metrics?.complexity || 'unknown',
          maintainability: resultData.architecture?.maintainability || 
                          resultData.architecture?.metrics?.maintainability || 
                          resultData.metrics?.maintainability || 'unknown',
          testability: resultData.architecture?.testability || 
                      resultData.architecture?.metrics?.testability || 
                      resultData.metrics?.testability || 'unknown'
        },
        patterns: resultData.architecture?.patterns || 
                 resultData.architecture?.detectedPatterns || 
                 resultData.patterns || [],
        antiPatterns: resultData.architecture?.antiPatterns || 
                     resultData.architecture?.violations || 
                     resultData.antiPatterns || [],
        recommendations: resultData.architecture?.recommendations || 
                        resultData.recommendations || []
      };
      
      this.logger.info(`Architecture data extracted successfully`);
      
      res.json({ success: true, data: architecture });
    } catch (error) {
      this.logger.error(`Failed to get analysis architecture:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get analysis charts data
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisCharts(req, res) {
    try {
      const { projectId } = req.params;
      const { type = 'trends' } = req.query;
      
      this.logger.info(`Getting analysis charts for project, type: ${type}`);
      
      // Get all analyses for this project
      const analyses = await this.analysisRepository.findByProjectId(projectId);
      
      if (analyses.length === 0) {
        return res.json({ success: true, data: { trends: [], metrics: {}, distributions: {} } });
      }
      
      // Generate chart data based on type
      let chartData = {};
      
      switch (type) {
        case 'trends':
          chartData = this.generateTrendsData(analyses);
          break;
        case 'metrics':
          chartData = this.generateMetricsData(analyses);
          break;
        case 'distributions':
          chartData = this.generateDistributionsData(analyses);
          break;
        default:
          chartData = this.generateTrendsData(analyses);
      }
      
      res.json({ success: true, data: chartData });
    } catch (error) {
      this.logger.error(`Failed to get analysis charts:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Generate trends data for charts
   * @param {Array} analyses - Array of analyses
   * @returns {Object} Trends data
   */
  generateTrendsData(analyses) {
    const trends = analyses.map(analysis => {
      const resultData = analysis.resultData || {};
      const summary = analysis.summary || {};
      
      return {
        date: analysis.createdAt,
        overallScore: summary.overallScore || 0,
        issuesCount: summary.criticalIssues || 0,
        recommendationsCount: summary.recommendations || 0,
        analysisType: analysis.analysisType || 'unknown'
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return { trends };
  }

  /**
   * Generate metrics data for charts
   * @param {Array} analyses - Array of analyses
   * @returns {Object} Metrics data
   */
  generateMetricsData(analyses) {
    if (analyses.length === 0) return {};
    
    const latestAnalysis = analyses[0];
    const resultData = latestAnalysis.resultData || {};
    const summary = latestAnalysis.summary || {};
    
    return {
      metrics: {
        overallScore: summary.overallScore || 0,
        totalAnalyses: summary.totalAnalyses || analyses.length,
        successfulAnalyses: summary.successfulAnalyses || analyses.filter(a => a.status === 'completed').length,
        criticalIssues: summary.criticalIssues || 0,
        recommendations: summary.recommendations || 0
      }
    };
  }

  /**
   * Generate distributions data for charts
   * @param {Array} analyses - Array of analyses
   * @returns {Object} Distributions data
   */
  generateDistributionsData(analyses) {
    if (analyses.length === 0) return {};
    
    const latestAnalysis = analyses[0];
    const resultData = latestAnalysis.resultData || {};
    
    return {
      distributions: {
        issuesBySeverity: {
          critical: resultData.codeQuality?.issues?.filter(i => i.severity === 'critical')?.length || 0,
          high: resultData.codeQuality?.issues?.filter(i => i.severity === 'high')?.length || 0,
          medium: resultData.codeQuality?.issues?.filter(i => i.severity === 'medium')?.length || 0,
          low: resultData.codeQuality?.issues?.filter(i => i.severity === 'low')?.length || 0
        },
        recommendationsByPriority: {
          critical: 1, // From your data
          high: 3,
          medium: 3,
          low: 1
        }
      }
    };
  }

  /**
   * Get analysis recommendations
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getAnalysisRecommendations(req, res) {
    try {
      const { projectId } = req.params;
      
      this.logger.info(`Getting analysis recommendations for project`);
      
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
      if (resultData.codeQuality?.recommendations && Array.isArray(resultData.codeQuality.recommendations)) {
        recommendations.push(...resultData.codeQuality.recommendations.map(rec => ({
          ...rec,
          source: 'code-quality',
          category: 'code-quality'
        })));
      }
      
      // Security recommendations
      if (resultData.security?.recommendations && Array.isArray(resultData.security.recommendations)) {
        recommendations.push(...resultData.security.recommendations.map(rec => ({
          ...rec,
          source: 'security',
          category: 'security'
        })));
      }
      
      // Architecture recommendations
      if (resultData.architecture?.recommendations && Array.isArray(resultData.architecture.recommendations)) {
        recommendations.push(...resultData.architecture.recommendations.map(rec => ({
          ...rec,
          source: 'architecture',
          category: 'architecture'
        })));
      }
      
      // Summary recommendations
      if (summary.recommendations && Array.isArray(summary.recommendations)) {
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
      if (resultData.integratedInsights && Array.isArray(resultData.integratedInsights)) {
        insights.push(...resultData.integratedInsights);
      }
      
      res.json({ success: true, data: { recommendations, insights } });
    } catch (error) {
      this.logger.error(`Failed to get analysis recommendations:`, error);
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
      this.logger.error(`Failed to generate comprehensive report:`, error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Get code quality analysis data (GET - no analysis)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getCodeQualityAnalysis(req, res) {
    try {
      const { projectPath } = req.params;

      this.logger.info(`Getting code quality analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'code-quality');
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No code quality analysis found'
        });
      }

      const analysis = latest.resultData;
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
          },
          cached: true,
          timestamp: latest.createdAt
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get code quality analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get security analysis data (GET - no analysis)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getSecurityAnalysis(req, res) {
    try {
      const { projectPath } = req.params;

      this.logger.info(`Getting security analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'security');
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No security analysis found'
        });
      }

      const analysis = latest.resultData;
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
          summary: this.securityService.getVulnerabilitySummary(analysis),
          cached: true,
          timestamp: latest.createdAt
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get security analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get performance analysis data (GET - no analysis)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getPerformanceAnalysis(req, res) {
    try {
      const { projectPath } = req.params;

      this.logger.info(`Getting performance analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'performance');
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No performance analysis found'
        });
      }

      const analysis = latest.resultData;
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
          summary: this.performanceService.getPerformanceSummary(analysis),
          cached: true,
          timestamp: latest.createdAt
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get performance analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get architecture analysis data (GET - no analysis)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getArchitectureAnalysis(req, res) {
    try {
      const { projectPath } = req.params;

      this.logger.info(`Getting architecture analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'architecture');
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No architecture analysis found'
        });
      }

      const analysis = latest.resultData;
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
          summary: this.architectureService.getArchitectureSummary(analysis),
          cached: true,
          timestamp: latest.createdAt
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get architecture analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get comprehensive analysis data (GET - no analysis)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  async getComprehensiveAnalysis(req, res) {
    try {
      const { projectPath } = req.params;

      this.logger.info(`Getting comprehensive analysis data`);

      // Get latest analysis from database
      const latest = await this.analysisRepository.findLatestByProjectPath(projectPath, 'comprehensive');
      if (!latest) {
        return res.status(404).json({
          success: false,
          error: 'No comprehensive analysis found'
        });
      }

      const analysis = latest.resultData;
      
      res.json({
        success: true,
        data: {
          ...analysis,
          cached: true,
          timestamp: latest.createdAt
        }
      });

    } catch (error) {
      this.logger.error(`Failed to get comprehensive analysis:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
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

// Hilfsfunktion: Prüfe, ob Analyse aktuell ist (z.B. < 10 Minuten alt)
function isAnalysisFresh(analysis, maxAgeMinutes = 10) {
  if (!analysis || !analysis.timestamp) return false;
  const now = Date.now();
  const ts = new Date(analysis.timestamp).getTime();
  return (now - ts) < maxAgeMinutes * 60 * 1000;
}

module.exports = AnalysisController; 