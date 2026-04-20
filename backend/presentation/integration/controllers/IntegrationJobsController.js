/**
 * AgentLayer / external orchestrator API — thin facade over tasks + queue.
 * Jobs are PIDEA tasks; job_id === task id.
 */

const crypto = require("crypto");
const Logger = require("@logging/Logger");
const TaskPriority = require("@value-objects/TaskPriority");
const TaskType = require("@value-objects/TaskType");
const IntegrationWebhookConfig = require("@infrastructure/integration/IntegrationWebhookConfig");

class IntegrationJobsController {
  constructor({
    taskApplicationService,
    taskService,
    taskQueueStore,
    taskRepository,
    logger,
  }) {
    this.taskApplicationService = taskApplicationService;
    this.taskService = taskService;
    this.taskQueueStore = taskQueueStore;
    this.taskRepository = taskRepository;
    this.logger = logger || new Logger("IntegrationJobsController");
  }

  _mapPriority(p) {
    const map = {
      low: TaskPriority.LOW,
      normal: TaskPriority.MEDIUM,
      high: TaskPriority.HIGH,
    };
    return map[p] || TaskPriority.MEDIUM;
  }

  _queuePriority(p) {
    const map = { low: "low", normal: "normal", high: "high" };
    return map[p] || "normal";
  }

  _describeContext(ctx) {
    if (ctx == null) return "";
    if (typeof ctx === "string") return ctx;
    if (ctx.markdown) return String(ctx.markdown);
    try {
      return JSON.stringify(ctx);
    } catch {
      return String(ctx);
    }
  }

  _taskStatusValue(task) {
    const s = task.status;
    if (s && typeof s === "object" && s.value) return s.value;
    return s;
  }

  _findQueueItem(projectId, taskId) {
    const q = this.taskQueueStore.getProjectQueue(projectId);
    return q.find(
      (item) =>
        item.options?.taskId === taskId ||
        item.context?.taskId === taskId ||
        item.context?.task?.id === taskId,
    );
  }

  _mapJobStatus(task, queueItem) {
    if (queueItem) {
      if (queueItem.status === "queued") {
        return { status: "queued", phase: "queued" };
      }
      if (queueItem.status === "running") {
        return { status: "running", phase: "running" };
      }
    }

    const s = this._taskStatusValue(task);
    switch (s) {
      case "pending":
      case "scheduled":
        return { status: "queued", phase: s };
      case "in_progress":
      case "paused":
        return { status: "running", phase: s };
      case "completed":
        return { status: "success", phase: "completed" };
      case "failed":
        return { status: "failed", phase: "failed" };
      case "cancelled":
        return { status: "canceled", phase: "canceled" };
      default:
        return { status: "running", phase: String(s) };
    }
  }

  /**
   * POST /api/v1/integration/jobs
   */
  async createJob(req, res) {
    try {
      const {
        goal,
        context = {},
        project_id: projectId,
        project_ref: projectRef = {},
        priority = "normal",
        correlation = {},
        auto_enqueue = true,
      } = req.body || {};

      if (!projectId) {
        return res.badRequest("project_id is required");
      }
      if (!goal || typeof goal !== "string") {
        return res.badRequest("goal (string) is required");
      }

      const userId = req.user?.id;
      const description = [
        this._describeContext(context),
        projectRef.repo_url ? `Repo: ${projectRef.repo_url}` : "",
        projectRef.branch ? `Branch: ${projectRef.branch}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");

      const metadata = {
        integration: {
          source: "external",
          correlation,
          project_ref: projectRef,
        },
        content: goal,
      };

      const created = await this.taskApplicationService.createTask(
        {
          title: goal.slice(0, 500),
          description: description || goal,
          priority: this._mapPriority(priority),
          type: TaskType.FEATURE,
          metadata,
        },
        projectId,
        userId,
      );

      let queue = null;
      if (auto_enqueue !== false) {
        queue = await this.taskApplicationService.executeTask(
          created.id,
          projectId,
          userId,
          {
            priority: this._queuePriority(priority),
            autoExecute: true,
          },
        );
      }

      return res.created({
        job_id: created.id,
        project_id: projectId,
        status: queue?.status || "created",
        queue_item_id: queue?.queueItemId || null,
        correlation,
        created_at: created.createdAt,
      });
    } catch (error) {
      this.logger.error("Integration createJob failed", {
        message: error.message,
      });
      return res.error("Failed to create job", 500, { details: error.message });
    }
  }

  /**
   * GET /api/v1/integration/jobs/:jobId
   */
  async getJob(req, res) {
    try {
      const { jobId } = req.params;
      const taskEntity = await this.taskRepository.findById(jobId);
      if (!taskEntity) {
        return res.notFound("Job not found");
      }

      const projectId = taskEntity.projectId;
      const task = await this.taskApplicationService.getTask(jobId, projectId);
      const queueItem = this._findQueueItem(projectId, jobId);
      const mapped = this._mapJobStatus(
        { status: task.status },
        queueItem,
      );

      let metaIntegration = {};
      try {
        const raw = task.metadata;
        const parsed =
          typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {};
        metaIntegration = parsed.integration || {};
      } catch {
        metaIntegration = {};
      }

      return res.success({
        job_id: jobId,
        project_id: projectId,
        status: mapped.status,
        progress: {
          pct: task.progress ?? 0,
          phase: mapped.phase,
        },
        error:
          mapped.status === "failed"
            ? { message: task.description?.slice?.(0, 500) || "failed" }
            : null,
        artifacts: {
          logs_url: null,
          pr_url: metaIntegration.project_ref?.pr_url || null,
        },
        correlation: metaIntegration.correlation || {},
        queue_item_id: queueItem?.id || null,
      });
    } catch (error) {
      if (
        error.message?.includes("not found") ||
        error.message?.includes("does not belong")
      ) {
        return res.notFound("Job not found");
      }
      this.logger.error("Integration getJob failed", {
        message: error.message,
      });
      return res.error("Failed to get job", 500, { details: error.message });
    }
  }

  /**
   * POST /api/v1/integration/jobs/:jobId/cancel
   */
  async cancelJob(req, res) {
    try {
      const { jobId } = req.params;
      const userId = req.user?.id;

      const taskEntity = await this.taskRepository.findById(jobId);
      if (!taskEntity) {
        return res.notFound("Job not found");
      }

      const projectId = taskEntity.projectId;
      const item = this._findQueueItem(projectId, jobId);

      if (
        item &&
        (item.status === "queued" || item.status === "running")
      ) {
        await this.taskQueueStore.cancelQueueItem(projectId, item.id, userId);
      } else {
        await this.taskService.cancelTask(jobId, userId);
      }

      return res.success({
        job_id: jobId,
        status: "canceled",
      });
    } catch (error) {
      this.logger.error("Integration cancelJob failed", {
        message: error.message,
      });
      if (error.message?.includes("not found")) {
        return res.notFound("Job not found");
      }
      return res.error("Failed to cancel job", 500, { details: error.message });
    }
  }

  /**
   * PUT /api/v1/integration/webhook
   */
  async registerWebhook(req, res) {
    try {
      if (!IntegrationWebhookConfig.isWebhookRegisterAllowed()) {
        return res.forbidden(
          "Runtime webhook registration disabled (set PIDEA_INTEGRATION_ALLOW_WEBHOOK_REGISTER=true)",
        );
      }
      const { url, secret } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.badRequest("url is required");
      }
      IntegrationWebhookConfig.setRuntimeFromBody({
        url,
        secret: secret || crypto.randomBytes(24).toString("hex"),
      });
      return res.success({
        configured: true,
        callback_url: IntegrationWebhookConfig.maskUrl(url),
      });
    } catch (error) {
      return res.error("Failed to register webhook", 500, {
        details: error.message,
      });
    }
  }

  /**
   * GET /api/v1/integration/webhook
   */
  async getWebhookConfig(req, res) {
    const url = IntegrationWebhookConfig.getCallbackUrl();
    return res.success({
      configured: !!url,
      callback_url: url ? IntegrationWebhookConfig.maskUrl(url) : null,
      register_allowed: IntegrationWebhookConfig.isWebhookRegisterAllowed(),
    });
  }
}

module.exports = IntegrationJobsController;
