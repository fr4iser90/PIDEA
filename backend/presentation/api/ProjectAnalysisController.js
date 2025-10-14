const Logger = require("@logging/Logger");
const logger = new Logger("ProjectAnalysisController");

class ProjectAnalysisController {
  constructor(dependencies = {}) {
    this.projectAnalysisApplicationService =
      dependencies.projectAnalysisApplicationService;
    this.logger = dependencies.logger || logger;
    if (!this.projectAnalysisApplicationService) {
      throw new Error(
        "ProjectAnalysisController requires projectAnalysisApplicationService dependency",
      );
    }
  }

  /**
   * Get all analyses for a project
   */
  async getProjectAnalyses(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user?.id;

      if (!projectId) {
        return res.badRequest("Project ID is required");
      }

      const result =
        await this.projectAnalysisApplicationService.getProjectAnalyses(
          projectId,
          userId,
        );

      const responseData = result.data;

      // Generate ETag for project analyses
      const etag =
        await this.projectAnalysisApplicationService.generateETag(responseData);

      // Check if client has current version
      const clientEtag = req.headers["if-none-match"];
      if (clientEtag === etag) {
        this.logger.info(
          "Client has current version, sending 304 Not Modified",
        );
        res.status(304).set("ETag", etag).end();
        return;
      }

      // Set ETag headers for caching
      res.set("ETag", etag);
      res.set("Cache-Control", "private, max-age=300, must-revalidate");

      res.success(responseData);
    } catch (error) {
      this.logger.error("Error getting project analyses:", error);
      res.error("Failed to get project analyses", 500);
    }
  }

  /**
   * Get latest analysis by type for a project
   */
  async getLatestAnalysisByType(req, res) {
    try {
      const { projectId, analysisType } = req.params;

      if (!projectId || !analysisType) {
        return res.badRequest("Project ID and analysis type are required");
      }

      const result =
        await this.projectAnalysisApplicationService.getLatestAnalysisByType(
          projectId,
          analysisType,
          req.user?.id,
        );
      const analysis = result.data;

      if (!analysis) {
        return res.notFound(
          "No ${analysisType} analysis found for project ${projectId}",
        );
      }

      const responseData = analysis.toJSON();

      // Generate ETag for latest analysis by type
      const etag =
        await this.projectAnalysisApplicationService.generateETag(responseData);

      // Check if client has current version
      const clientEtag = req.headers["if-none-match"];
      if (clientEtag === etag) {
        this.logger.info(
          "Client has current version, sending 304 Not Modified",
        );
        res.status(304).set("ETag", etag).end();
        return;
      }

      // Set ETag headers for caching
      res.set("ETag", etag);
      res.set("Cache-Control", "private, max-age=300, must-revalidate");

      res.success(responseData);
    } catch (error) {
      this.logger.error("Error getting latest analysis:", error);
      res.error("Failed to get latest analysis", 500);
    }
  }

  /**
   * Get all analyses by type for a project
   */
  async getAnalysesByType(req, res) {
    try {
      const { projectId, analysisType } = req.params;

      if (!projectId || !analysisType) {
        return res.badRequest("Project ID and analysis type are required");
      }

      const result =
        await this.projectAnalysisApplicationService.getAnalysesByType(
          projectId,
          analysisType,
          req.user?.id,
        );
      const analyses = result.data.analyses;

      const responseData = {
        projectId,
        analysisType,
        analyses: analyses.map((analysis) => analysis.toJSON()),
        count: analyses.length,
      };

      // Generate ETag for analyses by type
      const etag =
        await this.projectAnalysisApplicationService.generateETag(responseData);

      // Check if client has current version
      const clientEtag = req.headers["if-none-match"];
      if (clientEtag === etag) {
        this.logger.info(
          "Client has current version, sending 304 Not Modified",
        );
        res.status(304).set("ETag", etag).end();
        return;
      }

      // Set ETag headers for caching
      res.set("ETag", etag);
      res.set("Cache-Control", "private, max-age=300, must-revalidate");

      res.success(responseData);
    } catch (error) {
      this.logger.error("Error getting analyses by type:", error);
      res.error("Failed to get analyses by type", 500);
    }
  }

  /**
   * Create a new analysis
   */
  async createAnalysis(req, res) {
    try {
      const {
        projectId,
        projectPath,
        analysisType,
        analysisData,
        metadata = {},
      } = req.body;

      if (!projectId || !projectPath || !analysisType || !analysisData) {
        return res.badRequest(
          "Project ID, project path, analysis type, and analysis data are required",
        );
      }

      const analysis = new ProjectAnalysis({
        projectId,
        projectPath,
        analysisType,
        analysisData,
        metadata,
      });

      const result =
        await this.projectAnalysisApplicationService.createProjectAnalysis(
          projectId,
          { type: analysisType, data: analysisData },
          req.user?.id,
        );
      const savedAnalysis = result.data;

      res.created(savedAnalysis.toJSON());
    } catch (error) {
      this.logger.error("Error creating analysis:", error);
      res.error("Failed to create analysis", 500);
    }
  }

  /**
   * Update an existing analysis
   */
  async updateAnalysis(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.badRequest("Analysis ID is required");
      }

      const existingResult =
        await this.projectAnalysisApplicationService.getProjectAnalysis(
          id,
          req.user?.id,
        );
      const existingAnalysis = existingResult.data;

      if (!existingAnalysis) {
        return res.notFound("Analysis not found");
      }

      // Update the analysis data
      if (updateData.analysisData) {
        existingAnalysis.updateAnalysisData(updateData.analysisData);
      }

      if (updateData.metadata) {
        Object.entries(updateData.metadata).forEach(([key, value]) => {
          existingAnalysis.addMetadata(key, value);
        });
      }

      if (updateData.version) {
        existingAnalysis.updateVersion(updateData.version);
      }

      const result =
        await this.projectAnalysisApplicationService.updateProjectAnalysis(
          id,
          req.body,
          req.user?.id,
        );
      const updatedAnalysis = result.data;

      res.success(existingAnalysis.toJSON());
    } catch (error) {
      this.logger.error("Error updating analysis:", error);
      res.error("Failed to update analysis", 500);
    }
  }

  /**
   * Delete an analysis
   */
  async deleteAnalysis(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.badRequest("Analysis ID is required");
      }

      const result =
        await this.projectAnalysisApplicationService.deleteProjectAnalysis(
          id,
          req.user?.id,
        );
      const deleted = result.success;

      if (!deleted) {
        return res.notFound("Analysis not found");
      }

      res.success({ message: "Analysis deleted successfully" });
    } catch (error) {
      this.logger.error("Error deleting analysis:", error);
      res.error("Failed to delete analysis", 500);
    }
  }

  /**
   * Get analysis statistics for a project
   */
  async getAnalysisStats(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.badRequest("Project ID is required");
      }

      const result =
        await this.projectAnalysisApplicationService.getAnalysisStats(
          projectId,
          req.user?.id,
        );
      const responseData = result.data;

      // Generate ETag for analysis stats
      const etag =
        await this.projectAnalysisApplicationService.generateETag(responseData);

      // Check if client has current version
      const clientEtag = req.headers["if-none-match"];
      if (clientEtag === etag) {
        this.logger.info(
          "Client has current version, sending 304 Not Modified",
        );
        res.status(304).set("ETag", etag).end();
        return;
      }

      // Set ETag headers for caching
      res.set("ETag", etag);
      res.set("Cache-Control", "private, max-age=300, must-revalidate");

      res.success(responseData);
    } catch (error) {
      this.logger.error("Error getting analysis stats:", error);
      res.error("Failed to get analysis statistics", 500);
    }
  }
}

module.exports = ProjectAnalysisController;
