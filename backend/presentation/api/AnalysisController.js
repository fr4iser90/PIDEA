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
      const { projectPath } = req.params;

      res.json({
        success: true,
        data: {
          projectPath,
          availableAnalyses: [
            'code-quality',
            'security',
            'performance',
            'architecture',
            'comprehensive'
          ],
          status: 'ready'
        }
      });

    } catch (error) {
      this.logger.error(`[AnalysisController] Get analysis status failed:`, error);
      res.status(500).json({
        success: false,
        error: error.message
      });
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
      const history = await this.analysisOutputService.getAnalysisHistory(projectId);
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